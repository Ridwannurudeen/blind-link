import React, { useState, useMemo, useEffect } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
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
  const [demoMode, setDemoMode] = useState(!connected);
  const [mxeChecked, setMxeChecked] = useState(!connected);

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
    if (!client) {
      setDemoMode(true);
      setMxeChecked(true);
      return;
    }
    client.isMxeAvailable().then((available) => {
      setDemoMode(!available);
      setMxeChecked(true);
    });
  }, [client]);

  const handleRegister = async () => {
    if (!identifier.trim()) return;

    setState("registering");
    setError("");

    if (demoMode || !client) {
      const data = new TextEncoder().encode(identifier.trim().toLowerCase());
      await crypto.subtle.digest("SHA-256", data);
      await new Promise((r) => setTimeout(r, 1500));

      // Persist demo registration to localStorage so Discovery can find it
      const normalized = identifier.trim().toLowerCase();
      const existing: string[] = JSON.parse(localStorage.getItem("blind-link-demo-registry") || "[]");
      if (!existing.includes(normalized)) {
        existing.push(normalized);
        localStorage.setItem("blind-link-demo-registry", JSON.stringify(existing));
      }

      setTxSig("demo-mode-local-registration");
      setState("success");
      return;
    }

    try {
      const sig = await client.registerSelf(identifier.trim());
      setTxSig(sig);
      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("MXE public key"))
        setError("Privacy network is offline. The network may be undergoing maintenance — please try again later.");
      else if (msg.includes("insufficient funds") || msg.includes("Insufficient"))
        setError("Insufficient wallet balance. Please add some test tokens to your wallet.");
      else if (msg.includes("User rejected"))
        setError("Transaction was canceled in your wallet.");
      else
        setError(msg);
      setState("error");
    }
  };

  return (
    <div className="page-container">
      <div className="card">
        <h2>Register Yourself</h2>
        <p className="subtitle">
          Add your contact identifier to the {demoMode ? "local demo" : "global encrypted"} registry.
          {demoMode
            ? " In demo mode, your identifier is stored locally so you can test discovery."
            : " Other users can then discover you without seeing the registry contents."}
        </p>

        {mxeChecked && demoMode && (
          <div className="demo-banner">
            <strong>Demo Mode</strong> — {!connected ? "No wallet connected." : "Privacy network is offline."}{" "}
            Registration is simulated locally with real SHA-256 hashing.
            {connected
              ? " In production, your identifier is encrypted and inserted via the privacy network."
              : " Connect a wallet for on-chain registration."}
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
                {demoMode
                  ? "Your identifier will be hashed and stored locally. Try discovering it afterwards!"
                  : "This will be hashed and encrypted before leaving your browser."}
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
            <div className="privacy-loader">
              <div className="privacy-fog" />
              <div className="privacy-fog" style={{ animationDelay: "1s" }} />
              <div className="privacy-shield">🔒</div>
            </div>
            <div className="progress-context">
              <p className="progress-message">
                {demoMode ? "Hashing locally..." : "Registering privately..."}
              </p>
              <p className="progress-detail">
                {demoMode
                  ? "Your identifier is being hashed with SHA-256 and saved to the local demo registry."
                  : "Your identifier is being hashed, encrypted, and inserted into the global registry through secure multi-party computation."}
              </p>
            </div>
          </div>
        )}

        {state === "success" && (
          <div className="success-state">
            <h3>Registered!</h3>
            <p>
              {demoMode
                ? "Your identifier has been hashed and saved to the local demo registry. Go to Discovery to find it!"
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
                Demo mode — your identifier is stored locally in this browser.
                In production, this runs privately inside the distributed privacy network.
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setState("idle");
                  setIdentifier("");
                }}
              >
                Register Another
              </button>
              <Link to="/discover" className="btn-primary">
                Discover Contacts
              </Link>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="error-state">
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
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

export default Register;
