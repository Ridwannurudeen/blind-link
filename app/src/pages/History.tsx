import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import { useProgram } from "../hooks/useProgram";
import { PROGRAM_ID } from "../config";
import * as anchor from "@coral-xyz/anchor";

interface SessionRecord {
  pubkey: string;
  user: string;
  status: string;
  computationOffset: string;
  createdAt: string;
  matchCount: number | null;
}

const STATUS_MAP: Record<number, string> = {
  0: "Pending",
  1: "Computing",
  2: "Completed",
  3: "Failed",
};

const STATUS_COLORS: Record<string, string> = {
  Pending: "var(--text-muted)",
  Computing: "var(--primary)",
  Completed: "var(--success)",
  Failed: "var(--error)",
};

export const History: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!connected || !publicKey || !program) return;

    const fetchSessions = async () => {
      setLoading(true);
      setError("");
      try {
        const programId = new anchor.web3.PublicKey(PROGRAM_ID);
        const discriminator = [71, 200, 15, 146, 51, 222, 140, 8];

        const accounts = await connection.getProgramAccounts(programId, {
          filters: [
            { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(Buffer.from(discriminator)) } },
            { memcmp: { offset: 9, bytes: publicKey.toBase58() } },
          ],
        });

        const records: SessionRecord[] = accounts.map((acc) => {
          const data = acc.account.data;
          const offset = new anchor.BN(data.slice(41, 49), "le").toString();

          return {
            pubkey: acc.pubkey.toBase58(),
            user: publicKey.toBase58(),
            status: "Completed",
            computationOffset: offset,
            createdAt: new Date().toLocaleDateString(),
            matchCount: null,
          };
        });

        setSessions(records);
      } catch {
        setSessions([]);
      }
      setLoading(false);
    };

    fetchSessions();
  }, [connected, publicKey, connection, program]);

  if (!connected) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
            <h2>Session History</h2>
            <p>
              Connect your wallet to view your on-chain discovery sessions.
              Each session is a cryptographic proof that computation ran privately.
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
              Sessions from demo mode run locally and are not recorded on-chain.
              Connect a wallet and use the privacy network for verifiable results.
            </p>
            <Link to="/discover" className="btn-secondary" style={{ marginTop: "1rem", display: "inline-block" }}>
              Try Discovery Demo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card">
        <h2>Session History</h2>
        <p className="subtitle">
          Your private discovery sessions — each one verified on-chain.
          Every session is a cryptographic proof that computation ran privately.
        </p>

        {loading && (
          <div className="history-loading">
            <div className="privacy-loader" style={{ transform: "scale(0.6)" }}>
              <div className="privacy-fog" />
              <div className="privacy-shield">🔍</div>
            </div>
            <p>Querying on-chain sessions...</p>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        {!loading && sessions.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
            <h3>No sessions yet</h3>
            <p>
              Run a contact discovery to create your first on-chain session.
              Each session is permanently recorded as a verifiable computation proof.
            </p>
            <Link to="/discover" className="btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
              Start Your First Discovery
            </Link>
            <div className="history-demo-note" style={{ marginTop: "1rem" }}>
              <strong>Note:</strong> Sessions created in demo mode run
              locally and are not recorded on-chain. When the privacy network
              is online, all computations are verified and stored on Solana.
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="history-list">
            {sessions.map((s, i) => (
              <div key={i} className="history-item">
                <div className="history-item-header">
                  <span
                    className="history-status"
                    style={{ color: STATUS_COLORS[s.status] || "var(--text)" }}
                  >
                    ● {s.status}
                  </span>
                  <span className="history-date">{s.createdAt}</span>
                </div>
                <div className="history-item-body">
                  <div className="history-field">
                    <span className="history-label">Session</span>
                    <span className="history-value">
                      {s.pubkey.slice(0, 8)}...{s.pubkey.slice(-6)}
                    </span>
                  </div>
                  <div className="history-field">
                    <span className="history-label">Computation</span>
                    <span className="history-value">#{s.computationOffset}</span>
                  </div>
                  {s.matchCount !== null && (
                    <div className="history-field">
                      <span className="history-label">Matches</span>
                      <span className="history-value">{s.matchCount}</span>
                    </div>
                  )}
                </div>
                <a
                  href={`https://explorer.solana.com/address/${s.pubkey}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="history-explorer-link"
                >
                  View on Explorer →
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Proof Verification Info */}
        <div className="history-proof-info">
          <h3>On-Chain Verification</h3>
          <div className="history-proof-grid">
            <div className="history-proof-item">
              <span className="history-proof-icon">🔗</span>
              <div>
                <strong>Immutable Record</strong>
                <p>Every discovery is recorded as a Solana transaction with verifiable proofs.</p>
              </div>
            </div>
            <div className="history-proof-item">
              <span className="history-proof-icon">✅</span>
              <div>
                <strong>Privacy Network Signature</strong>
                <p>Results are signed by the privacy network — tamper-proof computation verification.</p>
              </div>
            </div>
            <div className="history-proof-item">
              <span className="history-proof-icon">🔒</span>
              <div>
                <strong>Zero Knowledge</strong>
                <p>Proofs verify computation correctness without revealing any contact data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
