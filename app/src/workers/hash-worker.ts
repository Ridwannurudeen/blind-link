// ============================================================================
// Blind-Link: Web Worker — Contact Hashing
// ============================================================================
// Runs in a dedicated Web Worker thread to prevent UI jank during
// large address book processing.
//
// CRITICAL: Uses shared contact-hash module to ensure hash consistency
// between registration and discovery paths. Privacy is enforced by Arcium
// MPC encryption, not by per-session salt randomization.
// ============================================================================

import { normalizeContact, hashNormalizedContact } from "../utils/contact-hash";

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
    const normalized = normalizeContact(contacts[i]);
    const hash = await hashNormalizedContact(normalized);
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
