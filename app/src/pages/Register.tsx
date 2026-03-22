import React, { useState, useMemo, useEffect, useRef } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import * as anchor from "@coral-xyz/anchor";
import { BlindLinkClient } from "../services/blind-link-client";
import { useProgram } from "../hooks/useProgram";

type RegisterState = "idle" | "registering" | "success" | "error";

/* ── Inline SVG Icons ──────────────────────────────────── */

const LockIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const AlertIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const HashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

/* ── Helper: SHA-256 hex ───────────────────────────────── */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Component ─────────────────────────────────────────── */

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
  const [hashPreview, setHashPreview] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /* Live hash preview with 300ms debounce */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!identifier.trim()) {
      setHashPreview("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      sha256Hex(identifier).then((hex) => {
        setHashPreview(hex.slice(0, 16));
      });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [identifier]);

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
      <div className="card register-card">
        <div className="register-header">
          <div className="register-icon">
            <LockIcon />
          </div>
          <h2>Register Yourself</h2>
        </div>
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

              {hashPreview && (
                <div className="register-hash-preview">
                  <span className="hash-preview-label">
                    <HashIcon /> This is what gets encrypted
                  </span>
                  <code className="hash-preview-value">{hashPreview}...</code>
                </div>
              )}
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
              <div className="privacy-shield"><ShieldIcon /></div>
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
            <div className="register-result-icon">
              <CheckCircleIcon />
            </div>
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
            <div className="register-result-icon">
              <AlertIcon />
            </div>
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
