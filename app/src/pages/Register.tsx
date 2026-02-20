import React, { useState, useMemo, useEffect } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { BlindLinkClient } from "../services/blind-link-client";
import { useProgram } from "../hooks/useProgram";
import { Shield, Lock, CheckCircle2, ExternalLink, AlertCircle, Loader2 } from "lucide-react";

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
      const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
      return new BlindLinkClient({ provider, program });
    } catch { return null; }
  }, [wallet, program, connection]);

  useEffect(() => {
    if (!client) return;
    client.isMxeAvailable().then((available) => { setDemoMode(!available); setMxeChecked(true); });
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
      if (msg.includes("MXE public key")) setError("Arcium MXE cluster is currently unavailable.");
      else if (msg.includes("insufficient funds") || msg.includes("Insufficient")) setError("Insufficient SOL balance.");
      else if (msg.includes("User rejected")) setError("Transaction rejected in wallet.");
      else setError(msg);
      setState("error");
    }
  };

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <Lock size={20} className="text-zinc-600 mx-auto mb-3" />
          <h2 className="text-[15px] font-semibold text-zinc-200 mb-1">Registry</h2>
          <p className="text-[13px] text-zinc-500">Connect your wallet to register.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-zinc-100">Register Identity</h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">Add your contact identifier to the encrypted global registry.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        {mxeChecked && demoMode && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
            <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
            <span className="text-[11px] text-amber-400/80">Demo mode — MXE cluster offline. Registration simulated locally.</span>
          </div>
        )}

        {state === "idle" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Contact Identifier</label>
              <input
                id="identifier"
                type="text"
                className="w-full bg-[#0d0d10] border border-border rounded-lg px-3.5 py-2.5 text-[13px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-arcium/50 focus:ring-1 focus:ring-arcium/20 transition-all"
                placeholder="e.g. alice@example.com or +1-555-0123"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <div className="flex items-center gap-1.5 mt-2">
                <Shield size={11} className="text-arcium/60 flex-shrink-0" />
                <span className="text-[11px] text-zinc-600">Hashed locally with SHA-256 before any transmission.</span>
              </div>
            </div>
            <button
              onClick={handleRegister}
              disabled={!identifier.trim()}
              className="w-full py-2.5 text-[13px] font-medium text-white bg-arcium hover:bg-arcium/90 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {demoMode ? "Register (Demo)" : "Register On-Chain"}
            </button>
          </div>
        )}

        {state === "registering" && (
          <div className="text-center py-8 space-y-3">
            <Loader2 size={24} className="text-arcium animate-spin mx-auto" />
            <p className="text-[13px] text-zinc-300">{demoMode ? "Processing locally..." : "Registering via Arcium MXE..."}</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-arcium/8 text-arcium border border-arcium/15">
              {demoMode ? "Local Processing" : "MPC Active — No node sees plaintext"}
            </span>
          </div>
        )}

        {state === "success" && (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={20} className="text-green-400" />
            </div>
            <h3 className="text-[14px] font-semibold text-green-400">Registered</h3>
            <p className="text-[12px] text-zinc-500">
              {demoMode ? "Identifier hashed locally. In production, encrypted via MPC." : "Encrypted and added to the global registry."}
            </p>
            {!demoMode && txSig && (
              <a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
                {txSig.slice(0, 8)}...{txSig.slice(-6)} <ExternalLink size={10} />
              </a>
            )}
            <div className="flex items-center justify-center gap-1.5">
              <Shield size={11} className="text-green-500" />
              <span className="text-[10px] font-medium text-green-500/80">{demoMode ? "Demo Complete" : "Verified On-Chain"}</span>
            </div>
            <button onClick={() => { setState("idle"); setIdentifier(""); }}
              className="text-[12px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-border hover:border-zinc-600 transition-colors">
              Register Another
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle size={20} className="text-red-400 mx-auto" />
            <p className="text-[13px] text-red-400">{error}</p>
            <button onClick={() => setState("idle")}
              className="text-[12px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-border hover:border-zinc-600 transition-colors">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
