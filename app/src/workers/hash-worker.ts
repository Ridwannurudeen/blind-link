// ============================================================================
// Blind-Link: Web Worker — Salted SHA-256 Contact Hashing
// ============================================================================
// Runs in a dedicated Web Worker thread to prevent UI jank during
// large address book processing. Hashes each contact with a per-session
// salt, truncates to u128 for MPC compatibility.
//
// Protocol:
//   1. Main thread sends { contacts: string[], salt: string }
//   2. Worker hashes each contact: SHA-256(salt || normalize(contact))
//   3. Worker sends back { hashes: bigint[], count: number }
//
// The salt is generated per-session client-side and never leaves the device.
// This prevents rainbow-table attacks against the hashed address book.
// ============================================================================

/// Normalize a contact identifier for consistent hashing.
/// - Phone numbers: strip all non-digit characters, ensure country code
/// - Emails: lowercase, trim whitespace
/// - Handles: lowercase, strip @ prefix
function normalizeContact(contact: string): string {
  const trimmed = contact.trim();

  // Phone number detection: starts with + or contains mostly digits
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    // Likely a phone number — normalize to digits only
    return digitsOnly;
  }

  // Email detection
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  // Generic handle/username
  return trimmed.toLowerCase().replace(/^@/, "");
}

/// Hash a single contact: SHA-256(salt || normalized_contact) → u128
async function hashContact(
  contact: string,
  salt: string
): Promise<bigint> {
  const normalized = normalizeContact(contact);
  const input = salt + normalized;

  // Encode to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // SHA-256 hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Truncate to u128 (first 16 bytes) — fits within Curve25519 scalar field
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
  salt: string;
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
  const { contacts, salt, batchId } = event.data;

  if (event.data.type !== "hash") return;

  const hashes: string[] = [];
  const total = contacts.length;
  const PROGRESS_INTERVAL = 50; // Report progress every 50 contacts

  for (let i = 0; i < total; i++) {
    const hash = await hashContact(contacts[i], salt);
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
