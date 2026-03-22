import React, { useState } from "react";

const CIRCUIT_INTERSECT = `#[instruction]
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

    let result = MatchResult { matched, match_count };
    client_contacts.owner.from_arcis(result)
}`;

const CIRCUIT_REGISTER = `#[instruction]
pub fn register_user(
    user_hash: Enc<Shared, ContactHash>,
    registry: Enc<Mxe, GlobalRegistry>,
) -> Enc<Mxe, GlobalRegistry> {
    let hash = user_hash.to_arcis();
    let mut reg = registry.to_arcis();
    let b_idx = (hash.hash % (NUM_BUCKETS as u128)) as u64;

    let mut insertion_succeeded = false;
    for b in 0..NUM_BUCKETS {
        let is_target = (b as u64) == b_idx;
        let insert_pos = reg.buckets[b].count;
        let has_space = insert_pos < (BUCKET_SIZE as u64);
        for j in 0..BUCKET_SIZE {
            let is_insert_slot = (j as u64) == insert_pos;
            if is_target && is_insert_slot && has_space {
                reg.buckets[b].fingerprints[j] = hash.hash;
                insertion_succeeded = true;
            }
        }
        if is_target && has_space {
            reg.buckets[b].count += 1;
        }
    }

    if insertion_succeeded { reg.total_users += 1; }
    registry.owner.from_arcis(reg)
}`;

interface CircuitFunction {
  name: string;
  code: string;
  complexity: string;
  description: string;
}

const FUNCTIONS: CircuitFunction[] = [
  {
    name: "intersect_contacts",
    code: CIRCUIT_INTERSECT,
    complexity: "O(n \u00d7 NUM_BUCKETS \u00d7 BUCKET_SIZE)",
    description: "Private Set Intersection: compares client contacts against the global registry. All branches compile to constant-time MPC selects \u2014 no secret-dependent branching.",
  },
  {
    name: "register_user",
    code: CIRCUIT_REGISTER,
    complexity: "O(NUM_BUCKETS \u00d7 BUCKET_SIZE)",
    description: "Inserts a user hash into the registry with constant-time writes. Bucket capacity is checked before insertion to prevent state corruption.",
  },
];

interface Props {
  className?: string;
  defaultOpen?: boolean;
}

export const CircuitInspector: React.FC<Props> = ({ className, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeFunc, setActiveFunc] = useState(0);

  return (
    <div className={`circuit-inspector ${className || ""}`}>
      <button className="circuit-inspector-toggle" onClick={() => setIsOpen(!isOpen)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span>Circuit Inspector</span>
        <span className="circuit-inspector-badge">Arcis</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ marginLeft: "auto", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="circuit-inspector-body fade-in-up">
          <p className="circuit-inspector-note">
            This code runs inside the MPC cluster — no node sees the inputs.
          </p>

          <div className="circuit-inspector-tabs">
            {FUNCTIONS.map((fn, i) => (
              <button
                key={fn.name}
                className={`circuit-inspector-tab ${i === activeFunc ? "active" : ""}`}
                onClick={() => setActiveFunc(i)}
              >
                {fn.name}
              </button>
            ))}
          </div>

          <div className="circuit-inspector-annotation">
            <div className="circuit-inspector-annotation-header">
              <span className="mono" style={{ color: "var(--primary)" }}>
                {FUNCTIONS[activeFunc].name}()
              </span>
              <span className="circuit-inspector-complexity">
                {FUNCTIONS[activeFunc].complexity}
              </span>
            </div>
            <p>{FUNCTIONS[activeFunc].description}</p>
          </div>

          <div className="circuit-inspector-code">
            <div className="hiw-scroll-code-header">
              <span className="hiw-scroll-code-dot" />
              <span className="hiw-scroll-code-dot" />
              <span className="hiw-scroll-code-dot" />
              <span className="hiw-scroll-code-file">encrypted-ixs/src/lib.rs</span>
            </div>
            <pre className="circuit-inspector-pre">
              <code>{FUNCTIONS[activeFunc].code}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
