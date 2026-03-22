import React from "react";

const LAYERS = [
  { label: "Browser", desc: "Local hashing", color: "var(--text-dim)" },
  { label: "Rescue Cipher", desc: "Per-session encryption", color: "var(--secondary)" },
  { label: "Cerberus MPC", desc: "N-1 dishonest majority", color: "var(--primary)" },
];

interface Props {
  className?: string;
}

export const PrivacyShield: React.FC<Props> = ({ className }) => {
  return (
    <div className={`privacy-shield-container ${className || ""}`}>
      <div className="privacy-shield-rings">
        {LAYERS.map((layer, i) => (
          <div
            key={layer.label}
            className={`privacy-shield-ring ring-${i}`}
            style={{
              borderColor: layer.color,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            <span className="privacy-shield-ring-label" style={{ color: layer.color }}>
              {layer.label}
            </span>
          </div>
        ))}
        <div className="privacy-shield-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Your Data</span>
        </div>
      </div>
      <div className="privacy-shield-legend">
        {LAYERS.map((layer) => (
          <div key={layer.label} className="privacy-shield-legend-item">
            <span className="privacy-shield-legend-dot" style={{ background: layer.color }} />
            <div>
              <span className="privacy-shield-legend-label">{layer.label}</span>
              <span className="privacy-shield-legend-desc">{layer.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
