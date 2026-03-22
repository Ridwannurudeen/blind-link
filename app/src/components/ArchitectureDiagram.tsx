import React, { useState, useEffect } from "react";

const STAGES = [
  {
    key: "client",
    label: "Your Device",
    desc: "Contacts hashed locally",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    key: "hash",
    label: "SHA-256",
    desc: "Truncated to u128",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
    ),
  },
  {
    key: "encrypt",
    label: "x25519 + Rescue",
    desc: "Per-session keys",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    key: "mpc",
    label: "3 Arx Nodes",
    desc: "Cerberus MPC (N-1)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="5" r="3" />
        <circle cx="5" cy="19" r="3" />
        <circle cx="19" cy="19" r="3" />
        <line x1="12" y1="8" x2="5" y2="16" />
        <line x1="12" y1="8" x2="19" y2="16" />
        <line x1="5" y1="19" x2="19" y2="19" />
      </svg>
    ),
  },
  {
    key: "chain",
    label: "Solana",
    desc: "Verifiable proof",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

interface Props {
  className?: string;
}

export const ArchitectureDiagram: React.FC<Props> = ({ className }) => {
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      setActiveIdx(step % STAGES.length);
      step++;
    }, 1600);

    // Start first stage immediately
    setActiveIdx(0);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`arch-diagram ${className || ""}`}>
      {STAGES.map((stage, i) => (
        <React.Fragment key={stage.key}>
          <div
            className={`arch-stage ${i <= activeIdx ? "active" : ""} ${
              i === activeIdx ? "current" : ""
            }`}
          >
            <div className="arch-stage-icon">{stage.icon}</div>
            <div className="arch-stage-label">{stage.label}</div>
            <div className="arch-stage-desc">{stage.desc}</div>
          </div>
          {i < STAGES.length - 1 && (
            <div
              className={`arch-line ${i < activeIdx ? "active" : ""}`}
            >
              <svg width="40" height="8" viewBox="0 0 40 8">
                <line x1="0" y1="4" x2="32" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                <polygon points="32,0 40,4 32,8" fill="currentColor" />
              </svg>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
