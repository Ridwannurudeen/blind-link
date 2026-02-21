import React, { useState, useEffect } from "react";

type Stage = "idle" | "hash" | "encrypt" | "compute" | "decrypt" | "done";

const STAGES: { key: Stage; label: string; duration: number }[] = [
  { key: "hash", label: "Local Hash", duration: 1200 },
  { key: "encrypt", label: "Encrypt", duration: 800 },
  { key: "compute", label: "Private Compute", duration: 2000 },
  { key: "decrypt", label: "Decrypt", duration: 800 },
  { key: "done", label: "Result", duration: 0 },
];

const SAMPLE_CONTACTS = ["alice@example.com", "bob@pm.me", "+1-555-0199"];
const SAMPLE_HASHES = ["a9f3e2...", "7bc41d...", "d0e8f5..."];
const SAMPLE_CIPHER = ["Enc(0x7a2f...)", "Enc(0x3d1c...)", "Enc(0xe9b4...)"];
const SAMPLE_SHARES = ["Share₁", "Share₂", "Share₃"];
const SAMPLE_RESULTS = ["alice@example.com → Match", "bob@pm.me → No match", "+1-555-0199 → Match"];

export const HowItWorks: React.FC = () => {
  const [stage, setStage] = useState<Stage>("idle");
  const [stageIdx, setStageIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  useEffect(() => {
    if (!running || stageIdx < 0) return;
    if (stageIdx >= STAGES.length) {
      setRunning(false);
      return;
    }
    setStage(STAGES[stageIdx].key);
    const dur = STAGES[stageIdx].duration;
    if (dur > 0) {
      const t = setTimeout(() => setStageIdx((i) => i + 1), dur);
      return () => clearTimeout(t);
    }
  }, [stageIdx, running]);

  const startDemo = () => {
    setStageIdx(0);
    setRunning(true);
  };

  const reset = () => {
    setStage("idle");
    setStageIdx(-1);
    setRunning(false);
  };

  const stageNum = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="page-container">
      <div className="card">
        <h2>How Blind-Link Works</h2>
        <p className="subtitle">
          Watch your data transform through each privacy layer — from plaintext
          contacts to encrypted computation and back.
        </p>

        {/* Stage Progress Bar */}
        <div className="hiw-progress">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className={`hiw-stage ${i <= stageNum ? "active" : ""} ${
                i === stageNum ? "current" : ""
              }`}
            >
              <div className="hiw-stage-dot">{i < stageNum ? "✓" : i + 1}</div>
              <span className="hiw-stage-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Data Flow Visualization */}
        <div className="hiw-flow">
          {/* Your Device */}
          <div className={`hiw-box ${stage === "hash" ? "hiw-active" : ""}`}>
            <div className="hiw-box-header">
              <span className="hiw-icon">💻</span> Your Device
            </div>
            <div className="hiw-box-content">
              {stage === "idle" && (
                <div className="hiw-data">
                  {SAMPLE_CONTACTS.map((c, i) => (
                    <span key={i} className="hiw-chip hiw-chip-plain">{c}</span>
                  ))}
                  <p className="hiw-label">Plaintext contacts</p>
                </div>
              )}
              {stage === "hash" && (
                <div className="hiw-data hiw-animate-in">
                  {SAMPLE_HASHES.map((h, i) => (
                    <span key={i} className="hiw-chip hiw-chip-hash">{h}</span>
                  ))}
                  <p className="hiw-label">SHA-256 hashes (truncated to u128)</p>
                </div>
              )}
              {(stage === "encrypt" || stage === "compute") && (
                <div className="hiw-data">
                  {SAMPLE_CIPHER.map((c, i) => (
                    <span key={i} className="hiw-chip hiw-chip-enc">{c}</span>
                  ))}
                  <p className="hiw-label">Encrypted with Rescue cipher</p>
                </div>
              )}
              {(stage === "decrypt" || stage === "done") && (
                <div className="hiw-data hiw-animate-in">
                  {SAMPLE_RESULTS.map((r, i) => (
                    <span key={i} className={`hiw-chip ${r.includes("Match") && !r.includes("No") ? "hiw-chip-match" : "hiw-chip-nomatch"}`}>
                      {r}
                    </span>
                  ))}
                  <p className="hiw-label">Only match flags decrypted locally</p>
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className={`hiw-arrow ${["encrypt", "compute"].includes(stage) ? "hiw-arrow-active" : ""}`}>
            {["encrypt", "compute"].includes(stage) ? "⟶" : "·"}
          </div>

          {/* Privacy Network */}
          <div className={`hiw-box ${stage === "compute" ? "hiw-active" : ""}`}>
            <div className="hiw-box-header">
              <span className="hiw-icon">🔐</span> Privacy Network (3 Nodes)
            </div>
            <div className="hiw-box-content">
              {["idle", "hash", "encrypt"].includes(stage) && (
                <div className="hiw-data">
                  <p className="hiw-label hiw-muted">Waiting for encrypted input...</p>
                </div>
              )}
              {stage === "compute" && (
                <div className="hiw-data hiw-animate-in">
                  <div className="hiw-nodes">
                    {[0, 1, 2].map((n) => (
                      <div key={n} className="hiw-node">
                        <span className="hiw-node-label">Privacy Node {n + 1}</span>
                        <span className="hiw-chip hiw-chip-share">{SAMPLE_SHARES[n]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="hiw-label">Each node sees only its secret share — never plaintext</p>
                </div>
              )}
              {(stage === "decrypt" || stage === "done") && (
                <div className="hiw-data">
                  <p className="hiw-label hiw-muted">Computation complete — shares destroyed</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Scorecard */}
        <div className="hiw-privacy">
          <h3>Privacy Scorecard</h3>
          <div className="hiw-privacy-grid">
            <div className="hiw-privacy-row">
              <span className="hiw-party">Your Browser</span>
              <span className="hiw-sees">✅ Sees contacts before hashing</span>
              <span className="hiw-hidden">🚫 Nothing sent unencrypted</span>
            </div>
            <div className="hiw-privacy-row">
              <span className="hiw-party">Privacy Node 1</span>
              <span className="hiw-sees">✅ Sees Share₁ only</span>
              <span className="hiw-hidden">🚫 Can't reconstruct data</span>
            </div>
            <div className="hiw-privacy-row">
              <span className="hiw-party">Privacy Node 2</span>
              <span className="hiw-sees">✅ Sees Share₂ only</span>
              <span className="hiw-hidden">🚫 Can't reconstruct data</span>
            </div>
            <div className="hiw-privacy-row">
              <span className="hiw-party">Privacy Node 3</span>
              <span className="hiw-sees">✅ Sees Share₃ only</span>
              <span className="hiw-hidden">🚫 Can't reconstruct data</span>
            </div>
            <div className="hiw-privacy-row hiw-highlight">
              <span className="hiw-party">On-Chain</span>
              <span className="hiw-sees">✅ Encrypted ciphertexts</span>
              <span className="hiw-hidden">🚫 Zero plaintext ever</span>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="hiw-compare">
          <h3>Traditional vs Blind-Link</h3>
          <div className="hiw-compare-grid">
            <div className="hiw-compare-card hiw-compare-bad">
              <h4>Traditional Contact Discovery</h4>
              <ul>
                <li>📤 Uploads full address book to server</li>
                <li>👁 Server sees all your contacts</li>
                <li>🗄 Stored in central database (breach risk)</li>
                <li>🤝 Trust the company won't misuse data</li>
              </ul>
            </div>
            <div className="hiw-compare-card hiw-compare-good">
              <h4>With Blind-Link</h4>
              <ul>
                <li>🔒 Contacts hashed locally, never uploaded</li>
                <li>🙈 No single party sees your data</li>
                <li>⛓ Encrypted state on Solana (no honeypot)</li>
                <li>🔐 Cryptographic guarantees, not promises</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Collapsible Tech Specs */}
        <div className={`collapsible ${techOpen ? "open" : ""}`}>
          <div
            className="collapsible-header"
            onClick={() => setTechOpen(!techOpen)}
          >
            <span className="collapsible-title">Under the Hood (Technical Details)</span>
            <span className="collapsible-icon">▼</span>
          </div>
          <div className="collapsible-content">
            <p style={{ marginBottom: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Blind-Link is built on cutting-edge cryptographic protocols:
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="tech-badge">Cerberus MPC Protocol</span>
              <span className="tech-badge">N-1 Dishonest Majority</span>
              <span className="tech-badge">Rescue Cipher</span>
              <span className="tech-badge">Salted SHA-256</span>
              <span className="tech-badge">PSI (Private Set Intersection)</span>
              <span className="tech-badge">Solana Devnet</span>
              <span className="tech-badge">Arcium MXE</span>
              <span className="tech-badge">Web Workers</span>
            </div>
            <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              The Cerberus protocol ensures security even if N-1 out of N nodes are
              malicious. Only 1 honest node is required for correct, private computation.
            </p>
          </div>
        </div>

        {/* Demo Button */}
        <div className="hiw-actions">
          {stage === "idle" ? (
            <button className="btn-primary" onClick={startDemo}>
              ▶ Watch the Flow
            </button>
          ) : stage === "done" ? (
            <button className="btn-secondary" onClick={reset}>
              ↻ Replay
            </button>
          ) : (
            <button className="btn-secondary" disabled>
              Running...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
