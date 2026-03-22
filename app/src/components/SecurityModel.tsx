import React, { useState } from "react";

interface ThreatScenario {
  id: string;
  title: string;
  summary: string;
  defense: string;
  details: string;
  icon: React.ReactNode;
}

const SCENARIOS: ThreatScenario[] = [
  {
    id: "client",
    title: "Malicious Client",
    summary: "What if a user tries to extract registry data?",
    defense: "Information-theoretic privacy",
    details: "A malicious client can only learn their own match results — by design. The PSI protocol reveals only binary yes/no flags. Non-matching contacts are information-theoretically invisible. Even a computationally unbounded adversary cannot learn which entries are in the registry beyond their own matches.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <line x1="18" y1="8" x2="23" y2="13" />
      </svg>
    ),
  },
  {
    id: "nodes",
    title: "Compromised Nodes (N-1)",
    summary: "What if most MPC nodes are controlled by an attacker?",
    defense: "Cerberus dishonest majority protocol",
    details: "The Cerberus protocol provides security even when N-1 out of N Arx nodes are malicious. Only one honest node is required. Secret shares are information-theoretically secure — even all colluding malicious nodes combined learn absolutely nothing about the inputs. MAC-authenticated shares detect any tampering.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="4" />
        <circle cx="12" cy="12" r="3" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    ),
  },
  {
    id: "chain",
    title: "Blockchain Surveillance",
    summary: "What if someone monitors all on-chain activity?",
    defense: "Rescue cipher encryption",
    details: "All on-chain data is Rescue-cipher encrypted ciphertexts. No plaintext ever touches Solana. Even with full blockchain access and historical transaction analysis, contacts remain hidden. The encrypted state reveals nothing about registry contents or query patterns.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    id: "mitm",
    title: "Man-in-the-Middle",
    summary: "What if someone intercepts network traffic?",
    defense: "x25519 forward secrecy",
    details: "Per-session ephemeral x25519 key pairs provide forward secrecy. Each discovery session generates fresh keys. Even if long-term keys are compromised in the future, past sessions cannot be decrypted. The Diffie-Hellman key exchange ensures only the client and MXE cluster can derive the shared secret.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

interface Props {
  className?: string;
}

export const SecurityModel: React.FC<Props> = ({ className }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`security-model ${className || ""}`}>
      {SCENARIOS.map((scenario) => {
        const isExpanded = expandedId === scenario.id;
        return (
          <div
            key={scenario.id}
            className={`security-model-card ${isExpanded ? "expanded" : ""}`}
          >
            <button
              className="security-model-header"
              onClick={() => toggle(scenario.id)}
            >
              <div className="security-model-icon">{scenario.icon}</div>
              <div className="security-model-info">
                <span className="security-model-title">{scenario.title}</span>
                <span className="security-model-summary">{scenario.summary}</span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="security-model-chevron"
                style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isExpanded && (
              <div className="security-model-body fade-in-up">
                <div className="security-model-defense">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>{scenario.defense}</span>
                </div>
                <p>{scenario.details}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
