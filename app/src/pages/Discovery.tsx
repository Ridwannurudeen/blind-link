import React, { useState, useMemo } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { BlindLinkClient, PsiResult } from "../services/blind-link-client";
import { BlindOnboarding } from "../components/BlindOnboarding";
import { ContactInput } from "../components/ContactInput";
import { useProgram } from "../hooks/useProgram";

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

  if (!connected) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Discover Contacts</h2>
          <p className="text-muted">Connect your wallet to discover contacts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {!contacts && (
        <div className="card">
          <ContactInput
            onSubmit={(parsed) => setContacts(parsed)}
            disabled={!client}
          />
        </div>
      )}

      {contacts && client && (
        <div className="card">
          <BlindOnboarding
            client={client}
            contacts={contacts}
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
          <button
            className="btn-secondary"
            onClick={() => {
              setContacts(null);
              setResult(null);
            }}
          >
            New Discovery
          </button>
        </div>
      )}
    </div>
  );
};
