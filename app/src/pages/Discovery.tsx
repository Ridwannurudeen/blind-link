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
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Contact Discovery</h2>
          <p className="text-sm text-zinc-500">Connect your wallet to discover contacts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Contact Discovery</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Find registered contacts without exposing your address book.
        </p>
      </div>

      {!contacts && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <ContactInput
            onSubmit={(parsed) => setContacts(parsed)}
            disabled={!client}
          />
        </div>
      )}

      {contacts && client && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <BlindOnboarding
            client={client}
            contacts={contacts}
            onComplete={(r) => setResult(r)}
            onError={(e) => console.error("PSI error:", e)}
          />
        </div>
      )}

      {result && (
        <div className="bg-zinc-900 border border-green-500/20 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-green-400">Discovery Complete</h3>
          </div>
          <p className="text-sm text-zinc-300">
            Found <span className="font-semibold text-zinc-100">{result.matchCount}</span> match{result.matchCount !== 1 ? "es" : ""} out of {result.totalChecked} contacts.
          </p>
          <a
            href={`https://explorer.solana.com/tx/${result.txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            Tx: {result.txSignature.slice(0, 8)}...{result.txSignature.slice(-8)}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </a>
          <div>
            <button
              onClick={() => { setContacts(null); setResult(null); }}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              New Discovery
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
