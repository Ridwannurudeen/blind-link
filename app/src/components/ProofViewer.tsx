import React, { useState } from "react";

export interface ProofData {
  txSignature: string;
  pdaAddress: string;
  clusterOffset: number;
  encryptedCiphertexts: string[];
  callbackVerified: boolean;
  demoMode: boolean;
}

interface ProofViewerProps {
  proof: ProofData;
}

const SOLANA_EXPLORER = "https://explorer.solana.com/tx/";

export const ProofViewer: React.FC<ProofViewerProps> = ({ proof }) => {
  const [expanded, setExpanded] = useState(false);

  const explorerUrl = proof.demoMode
    ? undefined
    : `${SOLANA_EXPLORER}${proof.txSignature}?cluster=devnet`;

  return (
    <div className="proof-viewer">
      <button
        className="proof-viewer-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="proof-viewer-toggle-icon">{expanded ? "\u25BC" : "\u25B6"}</span>
        <span>On-Chain Proof</span>
        {proof.callbackVerified && (
          <span className="proof-viewer-verified" title="Callback verified">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verified
          </span>
        )}
      </button>

      {expanded && (
        <div className="proof-viewer-body">
          {/* Transaction Hash */}
          <div className="proof-viewer-row">
            <span className="proof-viewer-label">Tx Hash</span>
            {explorerUrl ? (
              <a
                className="proof-viewer-link"
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {proof.txSignature.slice(0, 16)}...{proof.txSignature.slice(-8)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "0.35rem" }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ) : (
              <span className="proof-viewer-mono">{proof.txSignature}</span>
            )}
          </div>

          {/* PDA Address */}
          <div className="proof-viewer-row">
            <span className="proof-viewer-label">PsiSession PDA</span>
            <span className="proof-viewer-mono">
              {proof.pdaAddress.slice(0, 16)}...{proof.pdaAddress.slice(-8)}
            </span>
          </div>

          {/* Cluster Offset */}
          <div className="proof-viewer-row">
            <span className="proof-viewer-label">Computation Offset</span>
            <span className="proof-viewer-mono">{proof.clusterOffset}</span>
          </div>

          {/* Encrypted Ciphertexts */}
          <div className="proof-viewer-section">
            <span className="proof-viewer-label">Encrypted Result Ciphertexts</span>
            <div className="proof-viewer-ciphertexts">
              {proof.encryptedCiphertexts.map((ct, i) => (
                <div key={i} className="proof-viewer-cipher-row">
                  <span className="proof-viewer-cipher-idx">[{i}]</span>
                  <span className="proof-viewer-mono">
                    {ct.length > 32 ? ct.slice(0, 32) + "..." : ct}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Callback Status */}
          <div className="proof-viewer-row">
            <span className="proof-viewer-label">Callback Verification</span>
            <span className={`proof-viewer-status ${proof.callbackVerified ? "verified" : "pending"}`}>
              {proof.callbackVerified ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </>
              ) : (
                "Pending"
              )}
            </span>
          </div>

          {proof.demoMode && (
            <p className="proof-viewer-demo-note">
              Demo mode -- proof data is simulated. In production, these values come from Solana on-chain state.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export function generateDemoProof(txSignature: string, matchCount: number): ProofData {
  const randomHex = (len: number) =>
    Array.from({ length: len }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join("");

  const ciphertexts = Array.from({ length: Math.max(matchCount, 1) }, () =>
    "0x" + randomHex(32)
  );

  return {
    txSignature: txSignature || "demo-" + randomHex(32),
    pdaAddress: randomHex(32),
    clusterOffset: 456,
    encryptedCiphertexts: ciphertexts,
    callbackVerified: true,
    demoMode: true,
  };
}

export default ProofViewer;
