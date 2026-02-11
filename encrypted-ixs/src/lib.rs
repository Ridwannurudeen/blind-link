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
// Complexity: O(n × NUM_BUCKETS × BUCKET_SIZE) per intersection, where n =
// client contacts. Because bucket indices are secret-shared, MPC cannot
// branch on them — the arcis compiler converts all if/else into constant-time
// select operations. All buckets are scanned with a target-bucket guard.
// ============================================================================

use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    // ── Registry Constants ──────────────────────────────────────────────

    pub const MAX_CLIENT_CONTACTS: usize = 16;
    pub const NUM_BUCKETS: usize = 4;
    pub const BUCKET_SIZE: usize = 16;

    // ── Data Structures ─────────────────────────────────────────────────

    /// A single contact hash: salted SHA-256 truncated to 128 bits.
    pub struct ContactHash {
        pub hash: u128,
    }

    /// Client's encrypted contact list submitted for intersection.
    pub struct ClientContacts {
        pub hashes: [u128; MAX_CLIENT_CONTACTS],
        pub count: u64,
    }

    /// Cuckoo-filter bucket holding fingerprints for the Global User Registry.
    pub struct RegistryBucket {
        pub fingerprints: [u128; BUCKET_SIZE],
        pub count: u64,
    }

    /// The full registry state stored as MXE-encrypted shared private state.
    pub struct GlobalRegistry {
        pub buckets: [RegistryBucket; NUM_BUCKETS],
        pub total_users: u64,
    }

    /// PSI result: per-contact match flags and total match count.
    pub struct MatchResult {
        pub matched: [bool; MAX_CLIENT_CONTACTS],
        pub match_count: u64,
    }

    // ── Core PSI Instruction ────────────────────────────────────────────

    /// Private Set Intersection: intersects client contacts against the
    /// Global User Registry. Non-matching contacts remain invisible.
    ///
    /// All if/else branches are compiled to constant-time MPC selects by
    /// the arcis compiler — no secret-dependent branching leaks.
    #[instruction]
    pub fn intersect_contacts(
        client_contacts: Enc<Shared, ClientContacts>,
        registry: Enc<Mxe, GlobalRegistry>,
    ) -> Enc<Shared, MatchResult> {
        let contacts = client_contacts.to_arcis();
        let reg = registry.to_arcis();

        let mut matched = [false; MAX_CLIENT_CONTACTS];
        let mut match_count: u64 = 0;

        for i in 0..MAX_CLIENT_CONTACTS {
            let active = (i as u64) < contacts.count;
            let contact_hash = contacts.hashes[i];

            // Bucket index: hash % NUM_BUCKETS (power of 2 → bitwise AND)
            let b_idx = (contact_hash % (NUM_BUCKETS as u128)) as u64;

            let mut found = false;
            for b in 0..NUM_BUCKETS {
                let is_target_bucket = (b as u64) == b_idx;

                for j in 0..BUCKET_SIZE {
                    let slot_active = (j as u64) < reg.buckets[b].count;
                    let eq = contact_hash == reg.buckets[b].fingerprints[j];

                    if is_target_bucket && slot_active && eq {
                        found = true;
                    }
                }
            }

            if active && found {
                matched[i] = true;
                match_count += 1;
            }
        }

        let result = MatchResult {
            matched,
            match_count,
        };
        client_contacts.owner.from_arcis(result)
    }

    // ── Registry Management ─────────────────────────────────────────────

    /// Register a new user's contact hash into the Global Registry.
    /// Inserts into the appropriate bucket using constant-time writes.
    #[instruction]
    pub fn register_user(
        user_hash: Enc<Shared, ContactHash>,
        registry: Enc<Mxe, GlobalRegistry>,
    ) -> Enc<Mxe, GlobalRegistry> {
        let hash = user_hash.to_arcis();
        let mut reg = registry.to_arcis();

        let b_idx = (hash.hash % (NUM_BUCKETS as u128)) as u64;

        for b in 0..NUM_BUCKETS {
            let is_target = (b as u64) == b_idx;
            let insert_pos = reg.buckets[b].count;

            for j in 0..BUCKET_SIZE {
                let is_insert_slot = (j as u64) == insert_pos;

                if is_target && is_insert_slot {
                    reg.buckets[b].fingerprints[j] = hash.hash;
                }
            }

            if is_target {
                reg.buckets[b].count += 1;
            }
        }

        reg.total_users += 1;
        registry.owner.from_arcis(reg)
    }

    /// Reveal the total number of registered users (public statistic).
    #[instruction]
    pub fn reveal_registry_size(registry: Enc<Mxe, GlobalRegistry>) -> u64 {
        let reg = registry.to_arcis();
        reg.total_users.reveal()
    }
}
