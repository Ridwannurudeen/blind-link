import React, { useState, useMemo } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import * as anchor from "@coral-xyz/anchor";
import { BlindLinkClient, PsiResult } from "../services/blind-link-client";
import { BlindOnboarding } from "../components/BlindOnboarding";
import { ContactInput } from "../components/ContactInput";
import { useProgram } from "../hooks/useProgram";

const DEMO_CONTACTS = [
  "alice@example.com",
  "bob@example.com",
  "carol@example.com",
  "dave@example.com",
  "eve@example.com",
];

export const Discovery: React.FC = () => {
  const { connected } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const program = useProgram();

  const [contacts, setContacts] = useState<string[] | null>(null);
  const [result, setResult] = useState<PsiResult | null>(null);

  const client = useMemo(() => {
    if (!wallet || !program) return null;
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new BlindLinkClient({ provider, program });
  }, [wallet, program, connection]);

  return (
    <div className="page-container">
      {!connected && (
        <div className="demo-banner">
          <strong>Demo Mode</strong> — No wallet connected. Running local
          simulation with real cryptographic hash matching. Connect a wallet
          for on-chain private computation.
        </div>
      )}

      {!contacts && !result && (
        <div className="card">
          <ContactInput
            onSubmit={(parsed) => setContacts(parsed)}
            disabled={false}
          />
          {!connected && (
            <p className="input-hint" style={{ marginTop: "0.75rem", textAlign: "center" }}>
              Try with sample contacts — no wallet required for demo mode
            </p>
          )}
        </div>
      )}

      {contacts && !result && (
        <div className="card">
          <BlindOnboarding
            client={client}
            contacts={contacts}
            demoRegisteredUsers={DEMO_CONTACTS}
            onComplete={(r) => setResult(r)}
            onError={(e) => console.error("PSI error:", e)}
          />
        </div>
      )}

      {result && (
        <div className="card result-summary">
          <h3>Discovery Complete</h3>
          <p>
            Found <strong>{result.matchCount}</strong> match
            {result.matchCount !== 1 ? "es" : ""} out of{" "}
            {result.totalChecked} contacts.
          </p>

          {!result.demoMode && result.txSignature && (
            <p className="tx-link">
              Tx:{" "}
              <a
                href={`https://explorer.solana.com/tx/${result.txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {result.txSignature.slice(0, 8)}...{result.txSignature.slice(-8)}
              </a>
            </p>
          )}

          {/* Post-discovery CTAs */}
          {result.matchCount === 0 && (
            <div className="cta-card">
              <h4>No matches yet</h4>
              <p>Invite your friends to join Blind-Link so you can discover each other privately.</p>
            </div>
          )}

          {result.matchCount > 0 && (
            <div className="cta-card">
              <h4>Share your experience</h4>
              <p>
                Found {result.matchCount} contact{result.matchCount !== 1 ? "s" : ""} privately —
                no data was shared with anyone.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              className="btn-primary"
              onClick={() => {
                setContacts(null);
                setResult(null);
              }}
            >
              New Discovery
            </button>
            {!connected && (
              <Link to="/register" className="btn-secondary">
                Register Yourself
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Discovery;
