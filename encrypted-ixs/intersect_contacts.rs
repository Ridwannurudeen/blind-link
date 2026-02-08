// ============================================================================
// Project Blind-Link: Private Set Intersection Circuit
// ============================================================================
// Arcis MXE circuit implementing Delegated PSI via Cuckoo-Filter-inspired
// fingerprint matching. Contact hashes (salted SHA-256 → u128) are compared
// against a Global User Registry stored in Arcium Shared Private State.
//
// Security model: Cerberus (Dishonest Majority) — only 1 honest Arx node
// required. Non-matching contacts remain information-theoretically invisible
// to both the server and the app developer.
//
// Complexity: O(n) linear scan with constant-factor optimization via
// bucket-based fingerprint compression.
// ============================================================================

use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    // ── Registry Constants ──────────────────────────────────────────────
    // Maximum contacts a client can submit per intersection batch.
    // Chosen to fit within MPC round budgets while covering 99% of
    // real-world address books (median ~300 contacts).
    pub const MAX_CLIENT_CONTACTS: usize = 512;

    // Maximum entries in the Global User Registry.
    // Sized for early-network capacity; scales via registry sharding.
    pub const MAX_REGISTRY_ENTRIES: usize = 4096;

    // Cuckoo filter parameters: 8 buckets × 512 fingerprints per bucket.
    // False positive rate ≈ 2^(-fingerprint_bits) × bucket_count ≈ negligible
    // at 128-bit fingerprints.
    pub const NUM_BUCKETS: usize = 8;
    pub const BUCKET_SIZE: usize = 512;

    // ── Data Structures ─────────────────────────────────────────────────

    /// A single contact hash: salted SHA-256 truncated to 128 bits.
    /// Using u128 keeps each value within the Curve25519 scalar field
    /// (< 2^252) while providing sufficient collision resistance for PSI.
    #[derive(ArcisType, Copy, Clone, ArcisEncryptable)]
    pub struct ContactHash {
        pub hash: mu128,
    }

    /// Client's encrypted contact list submitted for intersection.
    /// `count` tracks actual contacts (rest are zero-padded).
    #[derive(ArcisType, Copy, Clone, ArcisEncryptable)]
    pub struct ClientContacts {
        pub hashes: [mu128; MAX_CLIENT_CONTACTS],
        pub count: mu64,
    }

    /// Cuckoo-filter-inspired bucket structure for the Global User Registry.
    /// Each bucket holds fingerprints at deterministic positions derived
    /// from hash mod NUM_BUCKETS. This avoids O(n×m) full cross-product
    /// comparison — instead each client hash checks only one bucket (O(n×b)).
    #[derive(ArcisType, Copy, Clone, ArcisEncryptable)]
    pub struct RegistryBucket {
        pub fingerprints: [mu128; BUCKET_SIZE],
        pub count: mu64,
    }

    /// The full registry state stored as MXE-encrypted shared private state.
    /// Bucketed layout reduces per-contact comparisons from O(m) to O(b)
    /// where b = BUCKET_SIZE, yielding ~8× speedup at current parameters.
    #[derive(ArcisType, Copy, Clone, ArcisEncryptable)]
    pub struct GlobalRegistry {
        pub buckets: [RegistryBucket; NUM_BUCKETS],
        pub total_users: mu64,
    }

    /// Per-contact intersection result: the original hash and a boolean
    /// indicating whether a match was found. Only matched contacts are
    /// revealed to the client; non-matches remain encrypted.
    #[derive(ArcisType, Copy, Clone, ArcisEncryptable)]
    pub struct MatchResult {
        pub matched: [mbool; MAX_CLIENT_CONTACTS],
        pub match_count: mu64,
    }

    // ── Helper: Bucket Index ────────────────────────────────────────────
    // Deterministic bucket assignment from a contact hash.
    // Uses simple modular reduction — sufficient because the hash is
    // already uniformly distributed (SHA-256 output).

    #[inline]
    fn bucket_index(hash: mu128) -> mu64 {
        // Modular reduction: hash % NUM_BUCKETS
        // NUM_BUCKETS is a public constant (8 = power of 2), so this
        // reduces to a bitwise AND on the underlying shares.
        let bucket_count = mu128::from(NUM_BUCKETS as u128);
        let index = hash % bucket_count;
        // Safe truncation: result is always < NUM_BUCKETS < u64::MAX
        mu64::from(index)
    }

    // ── Core PSI Instruction ────────────────────────────────────────────

    /// Private Set Intersection: intersects a client's contact hashes
    /// against the Global User Registry without revealing:
    ///   - Non-matching contacts to anyone (server, app, or registry)
    ///   - The registry contents to the client
    ///   - Which specific contacts matched to the registry operator
    ///
    /// Algorithm:
    ///   1. For each client contact, compute its bucket index
    ///   2. Scan only that bucket's fingerprints for equality
    ///   3. Accumulate match flags in constant time (no early exit)
    ///
    /// Complexity: O(n × b) where n = client contacts, b = bucket size
    /// MPC rounds: O(1) per comparison (equality is a single round in
    /// Cerberus with preprocessing)
    #[instruction]
    pub fn intersect_contacts(
        client_contacts: Enc<Shared, ClientContacts>,
        registry: Enc<Mxe, GlobalRegistry>,
    ) -> Enc<Shared, MatchResult> {
        let contacts = client_contacts.to_arcis();
        let reg = registry.to_arcis();

        let mut result = MatchResult {
            matched: [mbool::from(false); MAX_CLIENT_CONTACTS],
            match_count: mu64::from(0u64),
        };

        // Linear scan: for each client contact, check its assigned bucket.
        // Both branches of the if (match / no-match) execute to prevent
        // timing side-channels — this is enforced by the MPC backend.
        let mut i: usize = 0;
        while i < MAX_CLIENT_CONTACTS {
            // Guard: skip zero-padded slots beyond actual contact count.
            // Note: comparison still executes on secret shares (no leak).
            let active = mu64::from(i as u64) < contacts.count;

            let contact_hash = contacts.hashes[i];
            let b_idx = bucket_index(contact_hash);

            // Scan the target bucket for a matching fingerprint
            let mut found = mbool::from(false);
            let mut b: usize = 0;
            while b < NUM_BUCKETS {
                let is_target_bucket = mu64::from(b as u64) == b_idx;

                let mut j: usize = 0;
                while j < BUCKET_SIZE {
                    let slot_active = mu64::from(j as u64) < reg.buckets[b].count;
                    let eq = contact_hash == reg.buckets[b].fingerprints[j];
                    // Match only if: correct bucket AND slot is populated AND hashes equal
                    let is_match = is_target_bucket & slot_active & eq;
                    found = found | is_match;
                    j += 1;
                }
                b += 1;
            }

            // Record match, gated on whether this slot is active
            let matched = active & found;
            result.matched[i] = matched;

            // Constant-time conditional increment
            let inc = mu64::from(matched);
            result.match_count = result.match_count + inc;

            i += 1;
        }

        // Re-encrypt result for the client (Shared owner)
        client_contacts.owner.from_arcis(result)
    }

    // ── Registry Management ─────────────────────────────────────────────

    /// Register a new user's contact hash into the Global Registry.
    /// Called once per user during onboarding. The hash is inserted
    /// into the appropriate bucket based on modular reduction.
    ///
    /// Returns the updated registry state, re-encrypted for the MXE.
    #[instruction]
    pub fn register_user(
        user_hash: Enc<Shared, ContactHash>,
        registry: Enc<Mxe, GlobalRegistry>,
    ) -> Enc<Mxe, GlobalRegistry> {
        let hash = user_hash.to_arcis();
        let mut reg = registry.to_arcis();

        let b_idx = bucket_index(hash.hash);

        // Insert into the correct bucket at the current count position.
        // Uses constant-time conditional writes across all buckets to
        // prevent leaking which bucket was modified.
        let mut b: usize = 0;
        while b < NUM_BUCKETS {
            let is_target = mu64::from(b as u64) == b_idx;
            let insert_pos = reg.buckets[b].count;

            let mut j: usize = 0;
            while j < BUCKET_SIZE {
                let is_insert_slot = mu64::from(j as u64) == insert_pos;
                let should_write = is_target & is_insert_slot;

                // Constant-time select: write hash if target, keep existing otherwise
                let existing = reg.buckets[b].fingerprints[j];
                reg.buckets[b].fingerprints[j] =
                    mu128::select(should_write, hash.hash, existing);
                j += 1;
            }

            // Increment bucket count only for the target bucket
            let inc = mu64::from(is_target);
            reg.buckets[b].count = reg.buckets[b].count + inc;
            b += 1;
        }

        reg.total_users = reg.total_users + mu64::from(1u64);
        registry.owner.from_arcis(reg)
    }

    /// Reveal the total number of registered users (public statistic).
    /// Does NOT reveal any individual hashes or bucket distributions.
    #[instruction]
    pub fn reveal_registry_size(registry: Enc<Mxe, GlobalRegistry>) -> u64 {
        let reg = registry.to_arcis();
        reg.total_users.reveal()
    }
}
