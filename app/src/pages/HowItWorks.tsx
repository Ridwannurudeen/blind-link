import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

interface ScrollSection {
  id: string;
  stage: number;
  color: string;
  title: string;
  subtitle: string;
  description: string;
  codeLabel: string;
  code: string;
  dataItems: { label: string; value: string }[];
}

const SECTIONS: ScrollSection[] = [
  {
    id: "raw",
    stage: 1,
    color: "var(--error)",
    title: "This Is What Apps See Today",
    subtitle: "Raw Contacts",
    description: "Every social app uploads your full address book to their server. Your contacts \u2014 and your contacts\u2019 contacts \u2014 become permanent surveillance assets.",
    codeLabel: "What gets uploaded vs. Blind-Link",
    code: `// Traditional contact discovery
fetch("/api/contacts", {
  method: "POST",
  body: JSON.stringify({
    contacts: [
      "alice@example.com",
      "bob@proton.me",
      "+1-555-0199"
    ]
  })
});
// Server now has your entire social graph

// Blind-Link normalizes locally instead:
// from app/src/utils/contact-hash.ts
function normalizeContact(contact: string): string {
  const trimmed = contact.trim();
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return digitsOnly; // phone -> digits only
  }
  const withoutLeadingAt = trimmed.replace(/^@/, "");
  if (withoutLeadingAt.includes("@")) {
    return withoutLeadingAt.toLowerCase(); // email
  }
  return withoutLeadingAt.toLowerCase(); // handle
}`,
    dataItems: [
      { label: "alice@example.com", value: "Plaintext" },
      { label: "bob@proton.me", value: "Plaintext" },
      { label: "+1-555-0199", value: "Plaintext" },
    ],
  },
  {
    id: "hash",
    stage: 2,
    color: "var(--primary)",
    title: "First, We Hash On Your Device",
    subtitle: "SHA-256 Hashing",
    description: "Contacts are hashed with SHA-256 and truncated to u128, all in a Web Worker. Raw contacts never leave your browser.",
    codeLabel: "contact-hash.ts",
    code: `// from app/src/utils/contact-hash.ts
export async function hashNormalizedContact(
  normalized: string
): Promise<bigint> {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256", data
  );
  const hashArray = new Uint8Array(hashBuffer);

  // Truncate to u128 (first 16 bytes, little-endian)
  let result = BigInt(0);
  for (let i = 0; i < 16; i++) {
    result |= BigInt(hashArray[i]) << BigInt(i * 8);
  }

  return result;
}`,
    dataItems: [
      { label: "a9f3e2c8...", value: "u128 hash" },
      { label: "7bc41d0f...", value: "u128 hash" },
      { label: "d0e8f5a1...", value: "u128 hash" },
    ],
  },
  {
    id: "encrypt",
    stage: 3,
    color: "var(--secondary)",
    title: "Then Encrypt With Per-Session Keys",
    subtitle: "x25519 + Rescue Cipher",
    description: "An ephemeral x25519 key pair is generated per session. Contact hashes are encrypted with the Rescue cipher before leaving your device.",
    codeLabel: "blind-link-client.ts",
    code: `// from app/src/services/blind-link-client.ts
private async initSession(): Promise<void> {
  this.clientPrivateKey =
    x25519.utils.randomSecretKey();
  this.clientPublicKey =
    x25519.getPublicKey(this.clientPrivateKey);

  const mxePublicKey =
    await getMXEPublicKeyWithRetry(
      this.provider,
      this.program.programId
    );

  this.sharedSecret = x25519.getSharedSecret(
    this.clientPrivateKey,
    mxePublicKey
  );
  this.cipher = new RescueCipher(this.sharedSecret);
  this.sessionNonce = randomBytes(16);
}`,
    dataItems: [
      { label: "Enc(0x7a2f...)", value: "Ciphertext" },
      { label: "Enc(0x3d1c...)", value: "Ciphertext" },
      { label: "Enc(0xe9b4...)", value: "Ciphertext" },
    ],
  },
  {
    id: "compute",
    stage: 4,
    color: "var(--primary)",
    title: "Split Across N Nodes, N-1 Can Be Malicious",
    subtitle: "Cerberus MPC Protocol",
    description: "Encrypted data enters the Arcium MXE cluster. The Cerberus protocol splits inputs into secret shares across 3+ Arx nodes. Even if all nodes except one are compromised, your data remains secure.",
    codeLabel: "encrypted-ixs/src/lib.rs (Arcis circuit)",
    code: `// from encrypted-ixs/src/lib.rs
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
        let b_idx = (contact_hash
            % (NUM_BUCKETS as u128)) as u64;

        let mut found = false;
        for b in 0..NUM_BUCKETS {
            let is_target_bucket =
                (b as u64) == b_idx;
            for j in 0..BUCKET_SIZE {
                let slot_active =
                    (j as u64) < reg.buckets[b].count;
                let eq = contact_hash
                    == reg.buckets[b].fingerprints[j];
                if is_target_bucket
                    && slot_active && eq {
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
        matched, match_count,
    };
    client_contacts.owner.from_arcis(result)
}`,
    dataItems: [
      { label: "Node 1: Share\u2081", value: "Secret share" },
      { label: "Node 2: Share\u2082", value: "Secret share" },
      { label: "Node 3: Share\u2083", value: "Secret share" },
    ],
  },
  {
    id: "reveal",
    stage: 5,
    color: "var(--success)",
    title: "Only Yes/No Flags Return To You",
    subtitle: "Match Reveal",
    description: "The MPC cluster returns only binary match flags. You decrypt them locally. Non-matching contacts are information-theoretically invisible to everyone \u2014 including the network.",
    codeLabel: "blind-link-client.ts \u2014 awaitAndReveal()",
    code: `// from app/src/services/blind-link-client.ts
async awaitAndReveal(contacts, computationOffset) {
  // Wait for Arcium MXE to finalize computation
  await awaitComputationFinalization(
    this.provider, computationOffset,
    this.program.programId, "confirmed"
  );

  // Fetch encrypted result from on-chain session
  const session = await this.program.account
    .psiSession.fetch(sessionPda);

  // Decrypt match flags locally with Rescue cipher
  const decrypted = this.cipher.decrypt(
    session.resultCiphertext,
    session.resultNonce
  );

  // Map boolean flags back to original contacts
  const matchedContacts: string[] = [];
  for (let i = 0; i < contacts.length; i++) {
    if (decrypted[i] !== BigInt(0)) {
      matchedContacts.push(contacts[i]);
    }
  }
  const matchCount = Number(
    decrypted[this.maxContacts]
  );
  // Non-matches: invisible to everyone
  // Registry: learned nothing about your contacts
  // Network: all secret shares destroyed
}`,
    dataItems: [
      { label: "alice@example.com", value: "Match" },
      { label: "bob@proton.me", value: "No match" },
      { label: "+1-555-0199", value: "Match" },
    ],
  },
];

export const HowItWorks: React.FC = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-section-id");
          if (id && entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, id]));
          }
        });
      },
      { threshold: 0.25 }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hiw-page">
      <div className="hiw-intro">
        <h1>How Blind-Link Works</h1>
        <p className="section-desc">
          Watch your data transform through each privacy layer — from plaintext
          contacts to encrypted computation and back.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const isVisible = visibleSections.has(section.id);
        return (
          <div
            key={section.id}
            data-section-id={section.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(section.id, el);
            }}
            className={`hiw-scroll-section ${isVisible ? "visible" : ""}`}
          >
            <div className="hiw-scroll-stage-num" style={{ color: section.color }}>
              {section.stage}
            </div>
            <div className="hiw-scroll-content">
              <span className="hiw-scroll-subtitle" style={{ color: section.color }}>
                {section.subtitle}
              </span>
              <h2>{section.title}</h2>
              <p className="hiw-scroll-desc">{section.description}</p>

              <div className="hiw-scroll-visual">
                {/* Data items */}
                <div className="hiw-scroll-data">
                  {section.dataItems.map((item, i) => (
                    <div
                      key={i}
                      className="hiw-scroll-data-item"
                      style={{
                        borderColor: section.color,
                        animationDelay: `${i * 0.15 + 0.3}s`,
                      }}
                    >
                      <span className="mono" style={{ color: section.color }}>
                        {item.label}
                      </span>
                      <span className="hiw-scroll-data-tag">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Code block */}
                <div className="hiw-scroll-code">
                  <div className="hiw-scroll-code-header">
                    <span className="hiw-scroll-code-dot" />
                    <span className="hiw-scroll-code-dot" />
                    <span className="hiw-scroll-code-dot" />
                    <span className="hiw-scroll-code-file">{section.codeLabel}</span>
                  </div>
                  <pre className="hiw-scroll-code-body">
                    <code>{section.code}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="hiw-cta">
        <div className="card card-glow">
          <h3>See It For Yourself</h3>
          <p className="section-desc">
            Try the demo — no wallet required. Real SHA-256 hash matching, running locally.
          </p>
          <Link to="/discover" className="btn-primary">
            Start Discovery
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
