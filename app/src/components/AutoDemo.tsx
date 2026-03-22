import React, { useState, useEffect, useRef, useCallback } from "react";

type Stage = "idle" | "contacts" | "hashing" | "encrypting" | "computing" | "results" | "summary";

interface ContactItem {
  value: string;
  type: "email" | "phone" | "handle";
  hash: string;
  cipher: string;
  match: boolean;
}

const CONTACTS: ContactItem[] = [
  { value: "alice@example.com", type: "email", hash: "a9f3e2c8...", cipher: "0x7a2f8d1c", match: true },
  { value: "bob@proton.me", type: "email", hash: "7bc41d0f...", cipher: "0x3d1c9e4b", match: false },
  { value: "+1-555-0199", type: "phone", hash: "d0e8f5a1...", cipher: "0xe9b4f6a2", match: true },
  { value: "carol@example.com", type: "email", hash: "2c6b8e3d...", cipher: "0x2c8d6f3a", match: false },
  { value: "@dave_web3", type: "handle", hash: "f1a4d9b7...", cipher: "0x9e1b4c7d", match: false },
];

const STAGE_ORDER: Stage[] = ["contacts", "hashing", "encrypting", "computing", "results", "summary"];

const STAGE_LABELS: Record<string, string> = {
  contacts: "Input",
  hashing: "Hash",
  encrypting: "Encrypt",
  computing: "Compute",
  results: "Results",
  summary: "Done",
};

const NODES = [
  { name: "Arx Node Alpha", share: "s\u2081 = 0x3a..." },
  { name: "Arx Node Beta", share: "s\u2082 = 0x7f..." },
  { name: "Arx Node Gamma", share: "s\u2083 = 0xb2..." },
];

const ArrowIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const LockIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ServerIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ReplayIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export const AutoDemo: React.FC = () => {
  const [stage, setStage] = useState<Stage>("idle");
  const [hasPlayed, setHasPlayed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const runDemo = useCallback(() => {
    clearTimeouts();
    setHasPlayed(true);

    const schedule = (s: Stage, delay: number) => {
      const id = setTimeout(() => setStage(s), delay);
      timeoutsRef.current.push(id);
    };

    setStage("contacts");
    schedule("hashing", 1200);
    schedule("encrypting", 2400);
    schedule("computing", 3800);
    schedule("results", 6000);
    schedule("summary", 7500);
  }, [clearTimeouts]);

  // IntersectionObserver auto-play
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed) {
          runDemo();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeouts();
    };
  }, [hasPlayed, runDemo, clearTimeouts]);

  const stageIndex = stage === "idle" ? -1 : STAGE_ORDER.indexOf(stage);

  const isStageActive = (s: Stage) => {
    const si = STAGE_ORDER.indexOf(s);
    return stageIndex >= si;
  };

  const isStageCurrent = (s: Stage) => stage === s;

  // Determine which data to show in the client panel
  const renderClientItems = () => {
    if (stage === "idle") return null;

    if (stage === "contacts") {
      return CONTACTS.map((c, i) => (
        <div
          key={i}
          className="auto-demo-item auto-demo-item-plain"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <span className={`auto-demo-type-badge auto-demo-type-${c.type}`}>{c.type}</span>
          <span className="mono">{c.value}</span>
        </div>
      ));
    }

    if (stage === "hashing") {
      return CONTACTS.map((c, i) => (
        <div
          key={i}
          className="auto-demo-item auto-demo-item-hash"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <span className="auto-demo-label">SHA-256</span>
          <span className="mono">{c.hash}</span>
        </div>
      ));
    }

    if (stage === "encrypting" || stage === "computing" || stage === "results" || stage === "summary") {
      return CONTACTS.map((c, i) => (
        <div
          key={i}
          className="auto-demo-item auto-demo-item-enc"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <span className="auto-demo-label">Rescue</span>
          <span className="mono">{c.cipher}</span>
        </div>
      ));
    }

    return null;
  };

  // Determine what to show in the network panel
  const renderNetworkContent = () => {
    if (stage === "idle") {
      return (
        <div className="auto-demo-network-idle">
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Awaiting data...</span>
        </div>
      );
    }

    if (stage === "contacts" || stage === "hashing") {
      return (
        <div className="auto-demo-computing-placeholder">
          <LockIcon size={32} />
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Waiting for encrypted input...</span>
        </div>
      );
    }

    if (stage === "encrypting") {
      return (
        <div className="auto-demo-computing-placeholder">
          <div className="auto-demo-lock-icon">
            <LockIcon size={32} />
          </div>
          <span style={{ fontSize: "0.82rem" }}>Receiving ciphertexts...</span>
        </div>
      );
    }

    if (stage === "computing") {
      return (
        <>
          <div className="auto-demo-nodes">
            {NODES.map((node, i) => (
              <div key={i} className="auto-demo-node" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="auto-demo-node-pulse" />
                <span className="auto-demo-node-icon"><ServerIcon /></span>
                <span className="auto-demo-node-label">{node.name}</span>
                <span className="auto-demo-share mono">{node.share}</span>
              </div>
            ))}
          </div>
          <p className="auto-demo-node-note">Secret shares - no node sees full data</p>
        </>
      );
    }

    if (stage === "results" || stage === "summary") {
      return (
        <div className="auto-demo-panel-body">
          {CONTACTS.map((c, i) => (
            <div
              key={i}
              className={`auto-demo-item ${c.match ? "auto-demo-item-match" : "auto-demo-item-nomatch"}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {c.match ? <CheckIcon /> : <XIcon />}
              <span className="mono">{c.value}</span>
              <span className={`auto-demo-result-badge ${c.match ? "match" : "no-match"}`}>
                {c.match ? "Match" : "No match"}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const isClientActive = stage !== "idle";
  const isNetworkActive = stageIndex >= STAGE_ORDER.indexOf("encrypting");
  const isArrowActive = stageIndex >= STAGE_ORDER.indexOf("encrypting");
  const isReverseArrowActive = stageIndex >= STAGE_ORDER.indexOf("results");

  return (
    <div className="auto-demo" ref={containerRef}>
      <div className="auto-demo-header">
        <h3>See the Pipeline in Action</h3>
      </div>

      {/* Stage progress dots */}
      <div className="auto-demo-stage-bar">
        {STAGE_ORDER.map((s, i) => (
          <div
            key={s}
            className={`auto-demo-stage-dot${isStageActive(s) ? " active" : ""}${isStageCurrent(s) ? " current" : ""}`}
          >
            <div className="auto-demo-stage-num">{i + 1}</div>
            <span className="auto-demo-stage-label">{STAGE_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {/* Three-column flow: Client -> Arrow -> Network */}
      <div className="auto-demo-flow">
        {/* Client panel */}
        <div className={`auto-demo-panel${isClientActive ? " active" : ""}`}>
          <div className="auto-demo-panel-header">Your Device</div>
          <div className="auto-demo-panel-body">
            {renderClientItems()}
          </div>
        </div>

        {/* Forward arrow */}
        <div className={`auto-demo-arrow${isArrowActive ? " active" : ""}`}>
          <ArrowIcon />
        </div>

        {/* Network panel */}
        <div className={`auto-demo-panel${isNetworkActive ? " active" : ""}`}>
          <div className="auto-demo-panel-header">Arcium MPC Network</div>
          {renderNetworkContent()}
        </div>

        {/* Reverse arrow */}
        <div className={`auto-demo-arrow reverse${isReverseArrowActive ? " active" : ""}`}>
          <ArrowIcon />
        </div>

        {/* Results panel (only visible at results/summary) */}
        {(stage === "results" || stage === "summary") && (
          <div className="auto-demo-panel active">
            <div className="auto-demo-panel-header">Verified Results</div>
            <div className="auto-demo-panel-body">
              {CONTACTS.map((c, i) => (
                <div
                  key={i}
                  className={`auto-demo-item ${c.match ? "auto-demo-item-match" : "auto-demo-item-nomatch"}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {c.match ? <CheckIcon /> : <XIcon />}
                  <span className="mono">{c.value}</span>
                  <span className={`auto-demo-result-badge ${c.match ? "match" : "no-match"}`}>
                    {c.match ? "Match" : "No match"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats bar */}
      {stage === "summary" && (
        <div className="auto-demo-summary">
          <div className="auto-demo-summary-stat">
            <span className="auto-demo-summary-num">2</span>
            <span>matches found</span>
          </div>
          <div className="auto-demo-summary-divider" />
          <div className="auto-demo-summary-stat">
            <span className="auto-demo-summary-num">0</span>
            <span>contacts shared</span>
          </div>
          <div className="auto-demo-summary-divider" />
          <div className="auto-demo-summary-stat">
            <span className="auto-demo-summary-num">3</span>
            <span>MPC nodes</span>
          </div>
        </div>
      )}

      {/* Actions: Replay + CTA */}
      {stage === "summary" && (
        <div className="auto-demo-actions">
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              setStage("idle");
              setHasPlayed(false);
              // Small delay to allow re-trigger via observer or click
              setTimeout(() => runDemo(), 100);
            }}
          >
            <ReplayIcon /> Replay
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={() => { window.location.href = "/discover"; }}
          >
            Try With Your Contacts
          </button>
        </div>
      )}
    </div>
  );
};
