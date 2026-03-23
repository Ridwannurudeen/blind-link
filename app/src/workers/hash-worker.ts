// ============================================================================
// Blind-Link: Web Worker — Deterministic SHA-256 Contact Hashing
// ============================================================================
// Runs in a dedicated Web Worker thread to prevent UI jank during
// large address book processing. Hashes each contact deterministically,
// truncates to u128 for MPC compatibility.
//
// Protocol:
//   1. Main thread sends { contacts: string[], batchId: string }
//   2. Worker hashes each contact: SHA-256(normalize(contact))
//   3. Worker sends back { hashes: string[], count: number, batchId }
//
// Hashing is DETERMINISTIC (no salt) — privacy is enforced by Arcium MPC
// encryption, not hash randomization. Same contact must always produce
// the same hash for PSI matching to work.
// ============================================================================

/// Normalize a contact identifier for consistent hashing.
/// MUST match contact-hash.ts normalizeContact() exactly.
function normalizeContact(contact: string): string {
  const trimmed = contact.trim();

  // Phone number detection
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return digitsOnly;
  }

  // Strip leading @ before classifying (handles like @username vs emails like user@domain)
  const withoutLeadingAt = trimmed.replace(/^@/, "");

  // Email detection: must have @ in the middle (not just a leading @)
  if (withoutLeadingAt.includes("@")) {
    return withoutLeadingAt.toLowerCase();
  }

  // Generic handle/username
  return withoutLeadingAt.toLowerCase();
}

/// Hash a single contact: SHA-256(normalized_contact) → u128
async function hashContact(contact: string): Promise<bigint> {
  const normalized = normalizeContact(contact);

  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Truncate to u128 (first 16 bytes, little-endian)
  let result = BigInt(0);
  for (let i = 0; i < 16; i++) {
    result |= BigInt(hashArray[i]) << BigInt(i * 8);
  }

  return result;
}

// ── Worker Message Handler ──────────────────────────────────────────────

interface HashRequest {
  type: "hash";
  contacts: string[];
  batchId: string;
}

interface HashResponse {
  type: "hash_result";
  hashes: string[]; // BigInts serialized as hex strings (Worker limitation)
  count: number;
  batchId: string;
}

interface ProgressUpdate {
  type: "progress";
  processed: number;
  total: number;
  batchId: string;
}

self.addEventListener("message", async (event: MessageEvent<HashRequest>) => {
  const { contacts, batchId } = event.data;

  if (event.data.type !== "hash") return;

  const hashes: string[] = [];
  const total = contacts.length;
  const PROGRESS_INTERVAL = 50; // Report progress every 50 contacts

  for (let i = 0; i < total; i++) {
    const hash = await hashContact(contacts[i]);
    // Serialize BigInt as hex string (BigInt not transferable via postMessage)
    hashes.push(hash.toString(16).padStart(32, "0"));

    // Emit progress updates for UI feedback
    if ((i + 1) % PROGRESS_INTERVAL === 0 || i === total - 1) {
      const progress: ProgressUpdate = {
        type: "progress",
        processed: i + 1,
        total,
        batchId,
      };
      self.postMessage(progress);
    }
  }

  const response: HashResponse = {
    type: "hash_result",
    hashes,
    count: total,
    batchId,
  };
  self.postMessage(response);
});
