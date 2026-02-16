// ============================================================================
// Blind-Link: TypeScript Client Service
// ============================================================================
// Frontend service orchestrating the full "Blind Onboarding" flow:
//   Step 1 — Local Hash:   Web Worker salted SHA-256 of address book
//   Step 2 — Arcium Compute: Encrypt + submit to MXE for private intersection
//   Step 3 — Result Reveal:  Decrypt matched contacts client-side
//
// Uses @arcium-hq/client for MXE key exchange, Rescue cipher encryption,
// and computation lifecycle management.
// ============================================================================

import { x25519 } from "@noble/curves/ed25519";
import { randomBytes } from "crypto";
import * as anchor from "@coral-xyz/anchor";
import {
  getArciumProgramId,
  getMXEPublicKey,
  getClusterAccAddress,
  getComputationAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getFeePoolAccAddress,
  getClockAccAddress,
  awaitComputationFinalization,
  RescueCipher,
  deserializeLE,
} from "@arcium-hq/client";

// ── Types ───────────────────────────────────────────────────────────────

export interface BlindLinkConfig {
  provider: anchor.AnchorProvider;
  program: anchor.Program;
  /** Arcium cluster offset (from Arcium.toml) */
  clusterOffset?: number;
  /** Maximum contacts per PSI batch (must match circuit constant) */
  maxContacts?: number;
}

export interface OnboardingCallbacks {
  onHashProgress?: (processed: number, total: number) => void;
  onHashComplete?: (count: number) => void;
  onComputeStart?: () => void;
  onComputeComplete?: () => void;
  onReveal?: (matchedContacts: string[]) => void;
  onError?: (error: Error) => void;
}

export interface PsiResult {
  /** Original contacts that matched registered users */
  matchedContacts: string[];
  /** Total contacts checked */
  totalChecked: number;
  /** Number of matches found */
  matchCount: number;
  /** Computation transaction signature */
  txSignature: string;
}

// ── Constants ───────────────────────────────────────────────────────────

const MAX_CLIENT_CONTACTS = 16;
const ARCIUM_CLUSTER_OFFSET = 456;
const REGISTRY_SEED = Buffer.from("blind_link_registry");
const SESSION_SEED = Buffer.from("psi_session");
const SIGN_PDA_SEED = Buffer.from("ArciumSignerAccount");

// ── Client Service ──────────────────────────────────────────────────────

export class BlindLinkClient {
  private provider: anchor.AnchorProvider;
  private program: anchor.Program;
  private arciumClusterOffset: number;
  private maxContacts: number;

  // Crypto state (refreshed per session)
  private clientPrivateKey: Uint8Array | null = null;
  private clientPublicKey: Uint8Array | null = null;
  private sharedSecret: Uint8Array | null = null;
  private cipher: RescueCipher | null = null;
  private sessionNonce: Uint8Array | null = null;

  constructor(config: BlindLinkConfig) {
    this.provider = config.provider;
    this.program = config.program;
    this.arciumClusterOffset = config.clusterOffset ?? ARCIUM_CLUSTER_OFFSET;
    this.maxContacts = config.maxContacts ?? MAX_CLIENT_CONTACTS;
  }

  // ── Key Exchange ────────────────────────────────────────────────────

  /** Initialize a fresh cryptographic session with the MXE cluster. */
  private async initSession(): Promise<void> {
    this.clientPrivateKey = x25519.utils.randomSecretKey();
    this.clientPublicKey = x25519.getPublicKey(this.clientPrivateKey);

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      this.provider,
      this.program.programId
    );

    this.sharedSecret = x25519.getSharedSecret(
      this.clientPrivateKey,
      mxePublicKey
    );
    this.cipher = new RescueCipher(this.sharedSecret);
    this.sessionNonce = randomBytes(16);
  }

  // ── Step 1: Local Hash ──────────────────────────────────────────────

  /**
   * Hash contacts in a Web Worker to avoid blocking the UI.
   * Returns hex-encoded u128 hashes and the salt used.
   */
  async hashContacts(
    contacts: string[],
    callbacks?: Pick<OnboardingCallbacks, "onHashProgress" | "onHashComplete">
  ): Promise<{ hashes: string[]; salt: string }> {
    // Generate a per-session salt (32 bytes, hex-encoded)
    const salt = Array.from(randomBytes(32))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const batchId = Array.from(randomBytes(8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return new Promise((resolve, reject) => {
      // Vite resolves this at build time via the `new URL(..., import.meta.url)` pattern.
      const worker = new Worker(
        new URL("../workers/hash-worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (event) => {
        if (event.data.batchId !== batchId) return;

        if (event.data.type === "progress") {
          callbacks?.onHashProgress?.(event.data.processed, event.data.total);
        }

        if (event.data.type === "hash_result") {
          callbacks?.onHashComplete?.(event.data.count);
          worker.terminate();
          resolve({ hashes: event.data.hashes, salt });
        }
      };

      worker.onerror = (event) => {
        worker.terminate();
        const msg = event.message || event.error?.message || "Unknown worker error";
        reject(new Error(`Hash worker failed: ${msg}`));
      };

      worker.postMessage({
        type: "hash",
        contacts,
        salt,
        batchId,
      });
    });
  }

  // ── Step 2: Arcium Compute ──────────────────────────────────────────

  /**
   * Encrypt hashed contacts and submit to Arcium MXE for private intersection.
   * Returns the computation offset for result retrieval.
   */
  async submitForIntersection(
    hashes: string[],
    callbacks?: Pick<OnboardingCallbacks, "onComputeStart">
  ): Promise<{ computationOffset: anchor.BN; txSignature: string }> {
    callbacks?.onComputeStart?.();

    // Initialize fresh crypto session
    await this.initSession();

    if (!this.cipher || !this.clientPublicKey || !this.sessionNonce) {
      throw new Error("Session initialization failed");
    }

    // Pad hashes to MAX_CLIENT_CONTACTS with zeros
    const paddedHashes: bigint[] = new Array(this.maxContacts).fill(BigInt(0));
    for (let i = 0; i < Math.min(hashes.length, this.maxContacts); i++) {
      paddedHashes[i] = BigInt("0x" + hashes[i]);
    }

    // Encrypt: each hash becomes a [u8; 32] ciphertext via Rescue cipher
    const plaintextValues = [...paddedHashes, BigInt(hashes.length)];
    const ciphertexts = this.cipher.encrypt(plaintextValues, this.sessionNonce);

    // Separate hash ciphertexts from count ciphertext
    const encryptedHashes = ciphertexts
      .slice(0, this.maxContacts)
      .map((ct: number[]) => Uint8Array.from(ct));
    const encryptedCount = Uint8Array.from(
      ciphertexts[this.maxContacts]
    );

    // Generate unique computation offset
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    // Derive PDA addresses
    const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [REGISTRY_SEED],
      this.program.programId
    );

    const [sessionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        SESSION_SEED,
        this.provider.wallet.publicKey.toBuffer(),
        computationOffset.toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );

    // Set up event listener BEFORE submitting (avoid race condition)
    const resultPromise = this.awaitPsiEvent();

    // Derive shared addresses
    const [signPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SIGN_PDA_SEED],
      this.program.programId
    );

    // Submit the PSI computation
    const txSignature = await this.program.methods
      .intersectContacts(
        computationOffset,
        encryptedHashes.map((h: Uint8Array) => Array.from(h)),
        Array.from(encryptedCount),
        Array.from(this.clientPublicKey),
        new anchor.BN(deserializeLE(this.sessionNonce).toString())
      )
      .accountsPartial({
        user: this.provider.wallet.publicKey,
        psiSession: sessionPda,
        registryState: registryPda,
        signPdaAccount: signPda,
        mxeAccount: getMXEAccAddress(this.program.programId),
        mempoolAccount: getMempoolAccAddress(
          this.arciumClusterOffset
        ),
        executingPool: getExecutingPoolAccAddress(
          this.arciumClusterOffset
        ),
        computationAccount: getComputationAccAddress(
          this.arciumClusterOffset,
          computationOffset
        ),
        compDefAccount: getCompDefAccAddress(
          this.program.programId,
          Buffer.from(getCompDefAccOffset("intersect_contacts")).readUInt32LE()
        ),
        clusterAccount: getClusterAccAddress(
          this.arciumClusterOffset
        ),
        poolAccount: getFeePoolAccAddress(),
        clockAccount: getClockAccAddress(),
        systemProgram: anchor.web3.SystemProgram.programId,
        arciumProgram: getArciumProgramId(),
      })
      .rpc({ commitment: "confirmed" });

    return { computationOffset, txSignature };
  }

  // ── Step 3: Result Reveal ───────────────────────────────────────────

  /**
   * Await MXE computation finalization and decrypt matched contacts.
   * Maps match flags back to original contact list.
   */
  async awaitAndReveal(
    contacts: string[],
    computationOffset: anchor.BN,
    callbacks?: Pick<OnboardingCallbacks, "onComputeComplete" | "onReveal">
  ): Promise<PsiResult> {
    if (!this.cipher || !this.sessionNonce) {
      throw new Error("No active session — call submitForIntersection first");
    }

    // Wait for Arcium MXE to complete the computation
    const finalizeSig = await awaitComputationFinalization(
      this.provider,
      computationOffset,
      this.program.programId,
      "confirmed"
    );

    callbacks?.onComputeComplete?.();

    // Fetch the session account to get encrypted results
    const [sessionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        SESSION_SEED,
        this.provider.wallet.publicKey.toBuffer(),
        computationOffset.toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );

    // Account type resolved from IDL after `anchor build` generates types
    const session = await (this.program.account as any).psiSession.fetch(sessionPda);

    if (session.status !== 2) {
      throw new Error(`PSI computation failed with status: ${session.status}`);
    }

    // Decrypt the match results
    // The result is MatchResult: matched[16] bools + match_count u64
    const decrypted = this.cipher.decrypt(
      session.resultCiphertext,
      session.resultNonce
    );

    // Parse: first MAX_CLIENT_CONTACTS values are match booleans,
    // last value is the total match count
    const matchedContacts: string[] = [];
    for (let i = 0; i < Math.min(contacts.length, this.maxContacts); i++) {
      if (decrypted[i] !== BigInt(0)) {
        matchedContacts.push(contacts[i]);
      }
    }

    const matchCount = Number(decrypted[this.maxContacts]);

    callbacks?.onReveal?.(matchedContacts);

    return {
      matchedContacts,
      totalChecked: contacts.length,
      matchCount,
      txSignature: finalizeSig,
    };
  }

  // ── Full Blind Onboarding Flow ──────────────────────────────────────

  /**
   * Execute the complete 3-step Blind Onboarding:
   *   1. Local Hash  → Web Worker salted SHA-256
   *   2. Arcium Compute → Encrypted PSI in MXE
   *   3. Result Reveal → Decrypt matched contacts
   */
  async blindOnboard(
    contacts: string[],
    callbacks?: OnboardingCallbacks
  ): Promise<PsiResult> {
    try {
      // Step 1: Local Hash
      const { hashes } = await this.hashContacts(contacts, callbacks);

      // Step 2: Arcium Compute
      const { computationOffset } = await this.submitForIntersection(
        hashes,
        callbacks
      );

      // Step 3: Result Reveal
      const result = await this.awaitAndReveal(
        contacts,
        computationOffset,
        callbacks
      );

      return result;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw err;
    }
  }

  // ── User Registration ───────────────────────────────────────────────

  /**
   * Register the current user's contact hash in the Global Registry.
   * Should be called once during initial app onboarding.
   */
  async registerSelf(contactIdentifier: string): Promise<string> {
    await this.initSession();

    if (!this.cipher || !this.clientPublicKey || !this.sessionNonce) {
      throw new Error("Session initialization failed");
    }

    // Hash the user's own contact identifier
    const encoder = new TextEncoder();
    const data = encoder.encode(contactIdentifier.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);

    let selfHash = BigInt(0);
    for (let i = 0; i < 16; i++) {
      selfHash |= BigInt(hashArray[i]) << BigInt(i * 8);
    }

    // Encrypt the self-hash
    const ciphertexts = this.cipher.encrypt([selfHash], this.sessionNonce);
    const encryptedHash = Uint8Array.from(ciphertexts[0]);

    const computationOffset = new anchor.BN(randomBytes(8), "hex");
    const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [REGISTRY_SEED],
      this.program.programId
    );

    const [signPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SIGN_PDA_SEED],
      this.program.programId
    );

    const txSignature = await this.program.methods
      .registerUser(
        computationOffset,
        Array.from(encryptedHash),
        Array.from(this.clientPublicKey),
        new anchor.BN(deserializeLE(this.sessionNonce).toString())
      )
      .accountsPartial({
        user: this.provider.wallet.publicKey,
        registryState: registryPda,
        signPdaAccount: signPda,
        mxeAccount: getMXEAccAddress(this.program.programId),
        mempoolAccount: getMempoolAccAddress(
          this.arciumClusterOffset
        ),
        executingPool: getExecutingPoolAccAddress(
          this.arciumClusterOffset
        ),
        computationAccount: getComputationAccAddress(
          this.arciumClusterOffset,
          computationOffset
        ),
        compDefAccount: getCompDefAccAddress(
          this.program.programId,
          Buffer.from(getCompDefAccOffset("register_user")).readUInt32LE()
        ),
        clusterAccount: getClusterAccAddress(
          this.arciumClusterOffset
        ),
        poolAccount: getFeePoolAccAddress(),
        clockAccount: getClockAccAddress(),
        systemProgram: anchor.web3.SystemProgram.programId,
        arciumProgram: getArciumProgramId(),
      })
      .rpc({ commitment: "confirmed" });

    await awaitComputationFinalization(
      this.provider,
      computationOffset,
      this.program.programId,
      "confirmed"
    );

    return txSignature;
  }

  // ── Internal Helpers ────────────────────────────────────────────────

  /** Event listener for PSI completion (set up before tx submission). */
  private awaitPsiEvent(): Promise<any> {
    return new Promise((resolve) => {
      const listener = this.program.addEventListener(
        "psiCompleteEvent",
        (event: any) => {
          this.program.removeEventListener(listener as number);
          resolve(event);
        }
      );
    });
  }
}

// ── Utilities ───────────────────────────────────────────────────────────

/** Retry helper for MXE public key retrieval (devnet latency). */
async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: anchor.web3.PublicKey,
  maxRetries = 20,
  interval = 500
): Promise<Uint8Array> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const key = await getMXEPublicKey(provider, programId);
      if (key) return key;
    } catch {
      // Retry on failure
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(
    "Failed to retrieve MXE public key after " + maxRetries + " attempts"
  );
}
