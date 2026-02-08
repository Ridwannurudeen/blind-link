// ============================================================================
// Blind-Link: Integration Test Suite
// ============================================================================
// Tests the full PSI lifecycle: registry init → user registration →
// contact intersection → result decryption.
// Run with: arcium test --cluster devnet
// ============================================================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { x25519 } from "@noble/curves/ed25519";
import { randomBytes } from "crypto";
import { expect } from "chai";
import {
  getArciumEnv,
  getMXEPublicKey,
  getClusterAccAddress,
  getComputationAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  awaitComputationFinalization,
  RescueCipher,
  deserializeLE,
} from "@arcium-hq/client";

import { BlindLink } from "../target/types/blind_link";

describe("blind-link", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BlindLink as Program<BlindLink>;
  const arciumEnv = getArciumEnv();

  const REGISTRY_SEED = Buffer.from("blind_link_registry");

  let registryPda: anchor.web3.PublicKey;
  let registryBump: number;

  // ── Setup ───────────────────────────────────────────────────────────

  before(async () => {
    [registryPda, registryBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [REGISTRY_SEED],
        program.programId
      );
  });

  // ── Test: Initialize Registry ─────────────────────────────────────

  it("initializes the global registry", async () => {
    const tx = await program.methods
      .initializeRegistry()
      .accountsPartial({
        registryState: registryPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    const registry = await program.account.registryState.fetch(registryPda);
    expect(registry.authority.toString()).to.equal(
      provider.wallet.publicKey.toString()
    );
    expect(registry.computationCount.toNumber()).to.equal(0);

    console.log("  Registry initialized:", tx);
  });

  // ── Test: Initialize Computation Definitions ──────────────────────

  it("initializes computation definitions", async () => {
    // Init all three comp defs
    await program.methods
      .initIntersectContactsCompDef()
      .accountsPartial({
        payer: provider.wallet.publicKey,
      })
      .rpc({ commitment: "confirmed" });

    await program.methods
      .initRegisterUserCompDef()
      .accountsPartial({
        payer: provider.wallet.publicKey,
      })
      .rpc({ commitment: "confirmed" });

    await program.methods
      .initRevealRegistrySizeCompDef()
      .accountsPartial({
        payer: provider.wallet.publicKey,
      })
      .rpc({ commitment: "confirmed" });

    console.log("  All computation definitions initialized");
  });

  // ── Test: Register a User ─────────────────────────────────────────

  it("registers a user in the global registry", async () => {
    // Setup crypto session
    const clientPrivateKey = x25519.utils.randomSecretKey();
    const clientPublicKey = x25519.getPublicKey(clientPrivateKey);
    const mxePublicKey = await getMXEPublicKey(provider, program.programId);
    const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);

    // Hash a test contact
    const testContact = "alice@example.com";
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(testContact)
    );
    const hashArray = new Uint8Array(hashBuffer);
    let contactHash = BigInt(0);
    for (let i = 0; i < 16; i++) {
      contactHash |= BigInt(hashArray[i]) << BigInt(i * 8);
    }

    // Encrypt
    const ciphertexts = cipher.encrypt([contactHash], nonce);
    const encryptedHash = Uint8Array.from(ciphertexts[0]);

    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const tx = await program.methods
      .registerUser(
        computationOffset,
        Array.from(encryptedHash) as number[],
        Array.from(clientPublicKey) as number[],
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        user: provider.wallet.publicKey,
        registryState: registryPda,
        computationAccount: getComputationAccAddress(
          arciumEnv.arciumClusterOffset,
          computationOffset
        ),
        clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(
          arciumEnv.arciumClusterOffset
        ),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("register_user")).readUInt32LE()
        ),
      })
      .rpc({ commitment: "confirmed" });

    // Wait for MXE computation
    await awaitComputationFinalization(
      provider,
      computationOffset,
      program.programId,
      "confirmed"
    );

    console.log("  User registered:", tx);
  });

  // ── Test: Private Set Intersection ────────────────────────────────

  it("performs private set intersection", async () => {
    // Setup fresh crypto session
    const clientPrivateKey = x25519.utils.randomSecretKey();
    const clientPublicKey = x25519.getPublicKey(clientPrivateKey);
    const mxePublicKey = await getMXEPublicKey(provider, program.programId);
    const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);

    // Create test contacts (one matching, rest non-matching)
    const testContacts = [
      "alice@example.com",  // registered above — should match
      "bob@unknown.com",    // not registered — should NOT match
      "charlie@test.org",   // not registered — should NOT match
    ];

    // Hash contacts
    const hashes: bigint[] = [];
    for (const contact of testContacts) {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(contact)
      );
      const hashArray = new Uint8Array(hashBuffer);
      let h = BigInt(0);
      for (let i = 0; i < 16; i++) {
        h |= BigInt(hashArray[i]) << BigInt(i * 8);
      }
      hashes.push(h);
    }

    // Pad to MAX_CLIENT_CONTACTS
    const MAX_CLIENT_CONTACTS = 512;
    const paddedHashes = new Array(MAX_CLIENT_CONTACTS).fill(BigInt(0));
    hashes.forEach((h, i) => (paddedHashes[i] = h));

    // Encrypt all hashes + count
    const plaintextValues = [...paddedHashes, BigInt(testContacts.length)];
    const ciphertexts = cipher.encrypt(plaintextValues, nonce);

    const encryptedHashes = ciphertexts
      .slice(0, MAX_CLIENT_CONTACTS)
      .map((ct: number[]) => Array.from(Uint8Array.from(ct)));
    const encryptedCount = Array.from(
      Uint8Array.from(ciphertexts[MAX_CLIENT_CONTACTS])
    );

    const computationOffset = new anchor.BN(randomBytes(8), "hex");
    const SESSION_SEED = Buffer.from("psi_session");
    const [sessionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        SESSION_SEED,
        provider.wallet.publicKey.toBuffer(),
        computationOffset.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    // Set up event listener
    type Event = anchor.IdlEvents<(typeof program)["idl"]>;
    const resultPromise = new Promise<any>((resolve) => {
      const listener = program.addEventListener(
        "psiCompleteEvent" as keyof Event,
        (event: any) => {
          program.removeEventListener(listener);
          resolve(event);
        }
      );
    });

    // Submit PSI computation
    const tx = await program.methods
      .intersectContacts(
        computationOffset,
        encryptedHashes,
        encryptedCount,
        Array.from(clientPublicKey) as number[],
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        user: provider.wallet.publicKey,
        psiSession: sessionPda,
        registryState: registryPda,
        computationAccount: getComputationAccAddress(
          arciumEnv.arciumClusterOffset,
          computationOffset
        ),
        clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(
          arciumEnv.arciumClusterOffset
        ),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(
            getCompDefAccOffset("intersect_contacts")
          ).readUInt32LE()
        ),
      })
      .rpc({ commitment: "confirmed" });

    console.log("  PSI computation submitted:", tx);

    // Await finalization
    await awaitComputationFinalization(
      provider,
      computationOffset,
      program.programId,
      "confirmed"
    );

    // Fetch and decrypt result
    const session = await program.account.psiSession.fetch(sessionPda);
    expect(session.status).to.equal(2); // completed

    const decrypted = cipher.decrypt(
      session.resultCiphertext,
      session.resultNonce
    );

    // Verify: first contact (alice) should match, others should not
    expect(decrypted[0]).to.not.equal(BigInt(0)); // alice matched
    expect(decrypted[1]).to.equal(BigInt(0));      // bob not matched
    expect(decrypted[2]).to.equal(BigInt(0));      // charlie not matched

    const matchCount = Number(decrypted[MAX_CLIENT_CONTACTS]);
    expect(matchCount).to.equal(1);

    console.log("  PSI result: 1 match found (alice@example.com)");
  });
});
