import React, { useState, useMemo } from "react";
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

  const client = useMemo(() => {
    if (!wallet || !program) return null;
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new BlindLinkClient({ provider, program });
  }, [wallet, program, connection]);

  const handleRegister = async () => {
    if (!client || !identifier.trim()) return;

    setState("registering");
    setError("");

    try {
      const sig = await client.registerSelf(identifier.trim());
      setTxSig(sig);
      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
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
              Register On-Chain
            </button>
          </>
        )}

        {state === "registering" && (
          <div className="registering-state">
            <div className="spinner" />
            <p>Registering on-chain via Arcium MXE...</p>
            <p className="detail">
              Your identifier is being hashed, encrypted, and inserted into the
              global registry through secure multi-party computation.
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="success-state">
            <h3>Registered!</h3>
            <p>
              Your identifier has been securely added to the encrypted registry.
            </p>
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
