import React, { useState, useMemo, useEffect } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { BlindLinkClient } from "../services/blind-link-client";
import { useProgram } from "../hooks/useProgram";

type RegisterState = "idle" | "registering" | "success" | "error";

export const Register: React.FC = () => {
  const { connected } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const program = useProgram();

  const [identifier, setIdentifier] = useState("");
  const [state, setState] = useState<RegisterState>("idle");
  const [txSig, setTxSig] = useState("");
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [mxeChecked, setMxeChecked] = useState(false);

  const client = useMemo(() => {
    if (!wallet || !program) return null;
    try {
      const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      return new BlindLinkClient({ provider, program });
    } catch {
      return null;
    }
  }, [wallet, program, connection]);

  useEffect(() => {
    if (!client) return;
    client.isMxeAvailable().then((available) => {
      setDemoMode(!available);
      setMxeChecked(true);
    });
  }, [client]);

  const handleRegister = async () => {
    if (!identifier.trim()) return;
    setState("registering");
    setError("");

    if (demoMode) {
      const data = new TextEncoder().encode(identifier.trim().toLowerCase());
      await crypto.subtle.digest("SHA-256", data);
      await new Promise((r) => setTimeout(r, 1500));
      setTxSig("demo-mode-local-registration");
      setState("success");
      return;
    }

    if (!client) return;
    try {
      const sig = await client.registerSelf(identifier.trim());
      setTxSig(sig);
      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("MXE public key"))
        setError("Arcium MXE cluster is currently unavailable.");
      else if (msg.includes("insufficient funds") || msg.includes("Insufficient"))
        setError("Insufficient SOL balance. Airdrop devnet SOL to your wallet.");
      else if (msg.includes("User rejected"))
        setError("Transaction rejected in wallet.");
      else
        setError(msg);
      setState("error");
    }
  };

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Registry</h2>
          <p className="text-sm text-zinc-500">Connect your wallet to register.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Register Identity</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Add your contact identifier to the encrypted global registry.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        {/* Demo mode indicator */}
        {mxeChecked && demoMode && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded bg-amber-500/5 border border-amber-500/15">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
            <span className="text-xs text-amber-400">
              Demo mode — MXE cluster offline. Registration simulated locally.
            </span>
          </div>
        )}

        {state === "idle" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Contact Identifier
              </label>
              <input
                id="identifier"
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. alice@example.com or +1-555-0123"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              {/* JIT Privacy Notice */}
              <div className="flex items-center gap-1.5 mt-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 flex-shrink-0">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="text-xs text-blue-400/70">
                  Hashed locally with SHA-256 before any transmission.
                </span>
              </div>
            </div>
            <button
              onClick={handleRegister}
              disabled={!identifier.trim()}
              className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              {demoMode ? "Register (Demo)" : "Register On-Chain"}
            </button>
          </div>
        )}

        {state === "registering" && (
          <div className="text-center py-6 space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-sm text-zinc-300">
                {demoMode ? "Processing locally..." : "Registering via Arcium MXE..."}
              </p>
              {/* JIT Privacy Notice */}
              <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                {demoMode ? "Local Processing" : "MPC Active — No node sees plaintext"}
              </span>
            </div>
          </div>
        )}

        {state === "success" && (
          <div className="text-center py-4 space-y-3">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-400">Registered</h3>
              <p className="text-xs text-zinc-500 mt-1">
                {demoMode
                  ? "Identifier hashed locally. In production, encrypted and stored via MPC."
                  : "Identifier encrypted and added to the global registry."}
              </p>
            </div>
            {!demoMode && txSig && (
              <a
                href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                {txSig.slice(0, 8)}...{txSig.slice(-6)}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            )}
            {/* JIT Privacy Notice */}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">
              {demoMode ? "Demo Complete" : "Verified On-Chain"}
            </span>
            <div>
              <button
                onClick={() => { setState("idle"); setIdentifier(""); }}
                className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Register Another
              </button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => setState("idle")}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
