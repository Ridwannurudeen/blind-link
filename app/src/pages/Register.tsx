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
      // Demo mode: hash locally, simulate registration
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
        setError("The Arcium MXE cluster is currently unavailable. Please try again later.");
      else if (msg.includes("insufficient funds") || msg.includes("Insufficient"))
        setError("Insufficient SOL balance. Please airdrop devnet SOL to your wallet.");
      else if (msg.includes("User rejected"))
        setError("Transaction was rejected in your wallet.");
      else
        setError(msg);
      setState("error");
    }
  };

  if (!connected) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Register</h2>
          <p className="text-muted">Connect your wallet to register.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card">
        <h2>Register Yourself</h2>
        <p className="subtitle">
          Add your contact identifier to the global encrypted registry.
          Other users can then discover you without seeing the registry contents.
        </p>

        {mxeChecked && demoMode && (
          <div className="demo-banner">
            <strong>Demo Mode</strong> — Arcium MXE cluster is offline. Registration
            will simulate the on-chain flow locally. In production, your identifier
            is encrypted and inserted via MPC.
          </div>
        )}

        {state === "idle" && (
          <>
            <div className="form-group">
              <label htmlFor="identifier">Your Contact Identifier</label>
              <input
                id="identifier"
                type="text"
                className="input-field"
                placeholder="e.g. alice@example.com or +1-555-0123"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <p className="input-hint">
                This will be hashed and encrypted before leaving your browser.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={handleRegister}
              disabled={!identifier.trim()}
            >
              {demoMode ? "Register (Demo)" : "Register On-Chain"}
            </button>
          </>
        )}

        {state === "registering" && (
          <div className="registering-state">
            <div className="spinner" />
            <p>{demoMode ? "Hashing locally..." : "Registering on-chain via Arcium MXE..."}</p>
            <p className="detail">
              {demoMode
                ? "Your identifier is being hashed with SHA-256. In production, it would be encrypted and inserted into the MXE registry."
                : "Your identifier is being hashed, encrypted, and inserted into the global registry through secure multi-party computation. This may take up to 30 seconds."}
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="success-state">
            <h3>Registered!</h3>
            <p>
              {demoMode
                ? "Your identifier has been hashed locally. In production, it would be securely added to the encrypted MXE registry."
                : "Your identifier has been securely added to the encrypted registry. Other users can now discover you privately."}
            </p>
            {!demoMode && txSig && (
              <p className="tx-link">
                Tx:{" "}
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {txSig.slice(0, 8)}...{txSig.slice(-8)}
                </a>
              </p>
            )}
            {demoMode && (
              <p className="demo-note">
                Demo mode — in production, this registration runs privately inside
                Arcium's MPC network.
              </p>
            )}
            <button
              className="btn-secondary"
              onClick={() => {
                setState("idle");
                setIdentifier("");
              }}
            >
              Register Another
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button className="btn-primary" onClick={() => setState("idle")}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
