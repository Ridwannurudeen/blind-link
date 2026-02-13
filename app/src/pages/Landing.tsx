import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";

export const Landing: React.FC = () => {
  const { connected } = useWallet();

  return (
    <div className="landing">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <span className="hero-badge">Powered by Arcium Confidential Computing</span>
        <h1>Blind-Link</h1>
        <p className="hero-tagline">
          Private Contact Discovery — Zero Data Exposure
        </p>
        <p className="hero-desc">
          Find which of your contacts are already on the platform without
          revealing your address book to anyone. Not even the network.
        </p>

        <div className="hero-actions">
          {connected ? (
            <>
              <Link to="/register" className="btn-primary">
                Register Yourself
              </Link>
              <Link to="/discover" className="btn-secondary">
                Discover Contacts
              </Link>
            </>
          ) : (
            <p className="connect-prompt">
              Connect your Phantom wallet to get started
            </p>
          )}
        </div>
      </section>

      {/* ── The Problem ────────────────────────────────────── */}
      <section className="problem-section">
        <h2>The Problem</h2>
        <p className="section-desc">
          Contact discovery on today's platforms requires handing over your
          most sensitive data. Here's what goes wrong:
        </p>
        <div className="problem-grid">
          <div className="problem-card">
            <div className="problem-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </div>
            <h3>Data Brokering</h3>
            <p>
              Apps sell your contact list to advertisers and third parties.
              Your social graph becomes their product.
            </p>
          </div>
          <div className="problem-card">
            <div className="problem-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <line x1="3" y1="15" x2="21" y2="22"/>
              </svg>
            </div>
            <h3>Unsecured Databases</h3>
            <p>
              Centralized servers are honeypots. One breach exposes
              millions of private contacts at once.
            </p>
          </div>
          <div className="problem-card">
            <div className="problem-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <line x1="18" y1="8" x2="23" y2="13"/>
                <line x1="23" y1="8" x2="18" y2="13"/>
              </svg>
            </div>
            <h3>Loss of Privacy</h3>
            <p>
              Even people who never signed up have their info exposed.
              You can't consent on behalf of your contacts.
            </p>
          </div>
        </div>
      </section>

      {/* ── How Blind-Link Solves It ──────────────────────── */}
      <section className="solution-section">
        <h2>How Blind-Link Solves It</h2>
        <p className="section-desc">
          Blind-Link uses <strong>Private Set Intersection (PSI)</strong> — a
          cryptographic technique that compares two lists and reveals only the
          overlap. The comparison happens inside Arcium's secure multi-party
          computation network, where no single node ever sees plaintext data.
        </p>
        <div className="privacy-table">
          <div className="privacy-row">
            <span className="privacy-party">Your Browser</span>
            <span className="privacy-sees">Sees your contacts before hashing — nothing leaves unencrypted</span>
          </div>
          <div className="privacy-row">
            <span className="privacy-party">Arcium MXE Nodes</span>
            <span className="privacy-sees">See encrypted fragments only — no single node gets the full picture</span>
          </div>
          <div className="privacy-row">
            <span className="privacy-party">Solana Blockchain</span>
            <span className="privacy-sees">Stores encrypted ciphertexts and verifiable computation proofs</span>
          </div>
          <div className="privacy-row highlight">
            <span className="privacy-party">You</span>
            <span className="privacy-sees">Only you see which contacts matched. Non-matches stay completely hidden.</span>
          </div>
        </div>
      </section>

      {/* ── How It Works (3-step) ─────────────────────────── */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3>Local Hash</h3>
            <p>
              Your contacts are hashed on-device using salted SHA-256.
              Nothing leaves your browser unencrypted.
            </p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <h3>Arcium MXE Compute</h3>
            <p>
              Encrypted hashes enter Arcium's MPC network. Multiple
              independent nodes process your data — no single node can
              see your contacts.
            </p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h3>Private Reveal</h3>
            <p>
              Only matched contacts are decrypted client-side using your
              session key. Non-matches remain invisible to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* ── Why Arcium ────────────────────────────────────── */}
      <section className="why-arcium">
        <h2>Why Arcium?</h2>
        <p className="section-desc">
          Traditional apps require you to trust a single company with your data.
          Arcium replaces that trust with mathematics.
        </p>
        <div className="comparison-grid">
          <div className="comparison-card traditional">
            <h3>Traditional Approach</h3>
            <ul>
              <li>Upload full address book to server</li>
              <li>Company sees all your contacts</li>
              <li>Data stored in a central database</li>
              <li>Trust the company won't misuse data</li>
              <li>Vulnerable to breaches</li>
            </ul>
          </div>
          <div className="comparison-card arcium">
            <h3>With Arcium + Blind-Link</h3>
            <ul>
              <li>Contacts hashed locally, never uploaded</li>
              <li>No single party sees your data</li>
              <li>Encrypted state on Solana blockchain</li>
              <li>Cryptographic guarantees, not promises</li>
              <li>No central honeypot to breach</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Tech Badges ───────────────────────────────────── */}
      <section className="tech-badges">
        <span className="badge">Solana Devnet</span>
        <span className="badge">Arcium MXE</span>
        <span className="badge">Cerberus Protocol</span>
        <span className="badge">N-1 Dishonest Majority</span>
        <span className="badge">PSI (Private Set Intersection)</span>
      </section>
    </div>
  );
};
