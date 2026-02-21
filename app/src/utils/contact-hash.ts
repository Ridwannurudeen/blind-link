// ============================================================================
// Blind-Link: Shared Contact Hashing & Canonicalization
// ============================================================================
// CRITICAL: This module MUST be used by both registration and discovery paths
// to ensure hash consistency. Any normalization changes must be applied to
// BOTH paths or matching will fail.
//
// Privacy Model:
//   - Hashing is DETERMINISTIC (no per-session salt) to enable matching
//   - Privacy is enforced by Arcium MPC encryption, not hash randomization
//   - Same contact always produces same hash across all operations
// ============================================================================

/**
 * Canonicalize a contact identifier for consistent hashing across
 * registration and discovery.
 *
 * Rules:
 *   - Phone numbers: strip all non-digits, no country code normalization
 *   - Emails: lowercase, trim whitespace
 *   - Handles/usernames: lowercase, trim whitespace, strip leading @
 *
 * Examples:
 *   "+1 (555) 123-4567" → "15551234567"
 *   "Alice@Example.COM  " → "alice@example.com"
 *   "@username" → "username"
 */
export function normalizeContact(contact: string): string {
  const trimmed = contact.trim();

  // Phone number detection: contains at least 7 consecutive digits
  // (or digits with minimal separators)
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    // Likely a phone number — normalize to digits only
    // Note: We do NOT add/validate country codes; user must enter full number
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

/**
 * Hash a normalized contact identifier to u128.
 *
 * Uses SHA-256 truncated to 128 bits (fits Curve25519 scalar field).
 * Deterministic: same input always produces same hash.
 *
 * @param normalized - Pre-normalized contact string from normalizeContact()
 * @returns BigInt u128 hash
 */
export async function hashNormalizedContact(
  normalized: string
): Promise<bigint> {
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

/**
 * Single-step convenience: normalize + hash in one call.
 *
 * @param contact - Raw contact identifier (email, phone, handle)
 * @returns Hex-encoded u128 hash (32 hex chars, zero-padded)
 */
export async function hashContact(contact: string): Promise<string> {
  const normalized = normalizeContact(contact);
  const hash = await hashNormalizedContact(normalized);
  return hash.toString(16).padStart(32, "0");
}
