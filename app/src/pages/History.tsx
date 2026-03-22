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

const statusFromByte = (b: number): string => {
  switch (b) {
    case 0: return "Pending";
    case 1: return "Computing";
    case 2: return "Completed";
    case 3: return "Failed";
    default: return "Unknown";
  }
};

const STATUS_COLORS: Record<string, string> = {
  Pending: "var(--text-muted)",
  Computing: "var(--primary)",
  Completed: "var(--success)",
  Failed: "var(--error)",
};

/* ── Inline SVG Icons ─────────────────────────────────── */

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChainIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ShieldCheckIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const EyeOffIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: "transform 0.2s ease",
      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ExternalLinkIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const ArrowRightIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const HashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

/* ── Empty State (Wallet Not Connected) ───────────────── */

const EmptyStateLocked: React.FC = () => (
  <div className="history-empty">
    <div className="history-empty-lock">
      <LockIcon className="history-empty-lock-icon" />
    </div>
    <h2>Session History</h2>
    <p>
      Connect your wallet to view your on-chain discovery sessions.
      Each session is a cryptographic proof that computation ran privately.
    </p>
    <p className="history-empty-note">
      Sessions from demo mode run locally and are not recorded on-chain.
      Connect a wallet and use the privacy network for verifiable results.
    </p>
    <Link to="/discover" className="btn-secondary history-empty-cta">
      Try Discovery Demo
    </Link>
  </div>
);

/* ── Empty State (No Sessions Yet) ────────────────────── */

const EmptyStateNoSessions: React.FC = () => (
  <div className="history-empty">
    <div className="history-empty-lock">
      <LockIcon className="history-empty-lock-icon" />
    </div>
    <h3>No sessions yet</h3>
    <p>
      Run a contact discovery to create your first on-chain session.
      Each session is permanently recorded as a verifiable computation proof.
    </p>
    <Link to="/discover" className="btn-primary history-empty-cta">
      <span>Run Your First Discovery</span>
      <ArrowRightIcon />
    </Link>
  </div>
);

/* ── Timeline Card ────────────────────────────────────── */

const TimelineCard: React.FC<{ session: SessionRecord; index: number }> = ({
  session,
  index,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="timeline-entry" style={{ animationDelay: `${index * 0.08}s` }}>
      {/* Dot on the line */}
      <div className="timeline-dot-wrapper">
        <div
          className="timeline-dot"
          style={{
            borderColor: STATUS_COLORS[session.status] || "var(--primary)",
            boxShadow: `0 0 8px ${STATUS_COLORS[session.status] || "var(--primary)"}`,
          }}
        />
      </div>

      {/* Card branching off */}
      <div className="timeline-card">
        <div className="timeline-card-header">
          <div className="timeline-card-status-row">
            <span
              className="timeline-card-status"
              style={{ color: STATUS_COLORS[session.status] || "var(--text)" }}
            >
              <span className="timeline-card-status-dot" style={{ background: STATUS_COLORS[session.status] || "var(--primary)" }} />
              {session.status}
            </span>
            <span className="timeline-card-date">{session.createdAt}</span>
          </div>

          <div className="timeline-card-stats">
            <div className="timeline-card-stat">
              <span className="timeline-card-stat-label">Session</span>
              <span className="timeline-card-stat-value mono">
                {session.pubkey.slice(0, 8)}...{session.pubkey.slice(-6)}
              </span>
            </div>
            <div className="timeline-card-stat">
              <span className="timeline-card-stat-label">Computation</span>
              <span className="timeline-card-stat-value mono">#{session.computationOffset}</span>
            </div>
            {session.matchCount !== null && (
              <div className="timeline-card-stat">
                <span className="timeline-card-stat-label">Matches</span>
                <span className="timeline-card-stat-value">{session.matchCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expand/collapse proof details */}
        <button
          className="timeline-card-expand"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span>Proof Details</span>
          <ChevronIcon expanded={expanded} />
        </button>

        {expanded && (
          <div className="timeline-card-proof">
            <div className="timeline-card-proof-row">
              <HashIcon />
              <span className="timeline-card-proof-label">TX Hash</span>
              <span className="timeline-card-proof-value mono">
                {session.pubkey.slice(0, 16)}...{session.pubkey.slice(-8)}
              </span>
            </div>
            <div className="timeline-card-proof-row">
              <HashIcon />
              <span className="timeline-card-proof-label">Computation ID</span>
              <span className="timeline-card-proof-value mono">#{session.computationOffset}</span>
            </div>
          </div>
        )}

        <a
          href={`https://explorer.solana.com/address/${session.pubkey}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="timeline-card-explorer"
        >
          <span>View on Solana Explorer</span>
          <ExternalLinkIcon />
        </a>
      </div>
    </div>
  );
};

/* ── Proof Info Section (SVG icons, no emoji) ─────────── */

const ProofInfo: React.FC = () => (
  <div className="history-proof-info">
    <h3>On-Chain Verification</h3>
    <div className="history-proof-grid">
      <div className="history-proof-item">
        <span className="history-proof-icon-svg"><ChainIcon /></span>
        <div>
          <strong>Immutable Record</strong>
          <p>Every discovery is recorded as a Solana transaction with verifiable proofs.</p>
        </div>
      </div>
      <div className="history-proof-item">
        <span className="history-proof-icon-svg"><ShieldCheckIcon /></span>
        <div>
          <strong>Privacy Network Signature</strong>
          <p>Results are signed by the privacy network -- tamper-proof computation verification.</p>
        </div>
      </div>
      <div className="history-proof-item">
        <span className="history-proof-icon-svg"><EyeOffIcon /></span>
        <div>
          <strong>Zero Knowledge</strong>
          <p>Proofs verify computation correctness without revealing any contact data.</p>
        </div>
      </div>
    </div>
  </div>
);

/* ── Main Component ───────────────────────────────────── */

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
          const statusByte = data[8]; // status field: byte after 8-byte discriminator
          const offset = new anchor.BN(data.slice(41, 49), "le").toString();

          return {
            pubkey: acc.pubkey.toBase58(),
            user: publicKey.toBase58(),
            status: statusFromByte(statusByte),
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

  /* Wallet not connected */
  if (!connected) {
    return (
      <div className="page-container">
        <div className="card">
          <EmptyStateLocked />
        </div>
      </div>
    );
  }

  /* Main timeline view */
  return (
    <div className="page-container">
      <div className="card">
        <h2>Session History</h2>
        <p className="subtitle">
          Your private discovery sessions -- each one verified on-chain.
        </p>

        {/* Loading state */}
        {loading && (
          <div className="history-loading">
            <div className="privacy-loader" style={{ transform: "scale(0.6)" }}>
              <div className="privacy-fog" />
              <div className="privacy-shield">
                <SearchIcon />
              </div>
            </div>
            <p>Querying on-chain sessions...</p>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        {/* Empty state */}
        {!loading && sessions.length === 0 && <EmptyStateNoSessions />}

        {/* Timeline */}
        {sessions.length > 0 && (
          <div className="history-timeline">
            <div className="timeline-line" />
            {sessions.map((s, i) => (
              <TimelineCard key={i} session={s} index={i} />
            ))}
          </div>
        )}

        <ProofInfo />
      </div>
    </div>
  );
};

export default History;
