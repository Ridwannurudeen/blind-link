import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";

export const Landing: React.FC = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const [techSpecsOpen, setTechSpecsOpen] = useState(false);

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <span className="hero-badge">Privacy-First Contact Discovery</span>
        <h1>Find Your Contacts, Privately</h1>
        <p className="hero-tagline">
          Zero data sharing. Instant discovery. Your contacts never leave your device.
        </p>
        <p className="hero-desc">
          Discover which of your contacts are already on the platform without
          revealing your address book to anyone — not even us. Powered by
          cryptographic proofs, not promises.
        </p>

        <div className="hero-actions">
          <button
            className="btn-primary"
            onClick={() => navigate("/discover")}
          >
            Try Demo Discovery
          </button>
          <Link to="/register" className="btn-secondary">
            Register Yourself
          </Link>
        </div>
        <p className="hero-hint">
          Explore the demo mode first — no wallet required
        </p>
      </section>

      {/* Benefit Badges */}
      <section className="benefit-badges">
        <div className="benefit-badge primary">
          <span className="benefit-badge-icon" aria-hidden="true">🔒</span>
          <span>Zero Data Sharing</span>
        </div>
        <div className="benefit-badge">
          <span className="benefit-badge-icon" aria-hidden="true">⚡</span>
          <span>Instant Discovery</span>
        </div>
        <div className="benefit-badge">
          <span className="benefit-badge-icon" aria-hidden="true">📱</span>
          <span>Contacts Never Leave Your Device</span>
        </div>
        <div className="benefit-badge">
          <span className="benefit-badge-icon" aria-hidden="true">🌐</span>
          <span>Open Source</span>
        </div>
      </section>

      {/* The Problem */}
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
                <line x1="1" y1="1" x2="23" y2="23" />
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <line x1="3" y1="15" x2="21" y2="22" />
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <line x1="18" y1="8" x2="23" y2="13" />
                <line x1="23" y1="8" x2="18" y2="13" />
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

      {/* How Blind-Link Solves It */}
      <section className="solution-section">
        <h2>How Blind-Link Solves It</h2>
        <p className="section-desc">
          Blind-Link uses cryptographic techniques to compare contact lists
          without revealing them. The comparison happens in a secure
          privacy network where no single party ever sees your data.
        </p>
        <div className="privacy-table">
          <div className="privacy-row">
            <span className="privacy-party">Your Browser</span>
            <span className="privacy-sees">Sees your contacts before hashing — nothing leaves unencrypted</span>
          </div>
          <div className="privacy-row">
            <span className="privacy-party">Privacy Network</span>
            <span className="privacy-sees">Sees encrypted fragments only — no single node gets the full picture</span>
          </div>
          <div className="privacy-row">
            <span className="privacy-party">Blockchain</span>
            <span className="privacy-sees">Stores encrypted ciphertexts and verifiable computation proofs</span>
          </div>
          <div className="privacy-row highlight">
            <span className="privacy-party">You</span>
            <span className="privacy-sees">Only you see which contacts matched. Non-matches stay completely hidden.</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3>Hash Locally</h3>
            <p>
              Your contacts are hashed on your device using industry-standard
              cryptography. Nothing leaves your browser unencrypted.
            </p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <h3>Private Computation</h3>
            <p>
              Encrypted hashes enter a secure privacy network. Multiple
              independent nodes process your data — no single node can
              see your contacts.
            </p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h3>Instant Results</h3>
            <p>
              Only matched contacts are revealed to you. Non-matches remain
              invisible to everyone, including the network.
            </p>
          </div>
        </div>
      </section>

      {/* Why This Works */}
      <section className="why-arcium">
        <h2>Why This Works</h2>
        <p className="section-desc">
          Traditional apps require you to trust a single company with your data.
          Blind-Link replaces that trust with mathematics.
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
            <h3>With Blind-Link</h3>
            <ul>
              <li>Contacts hashed locally, never uploaded</li>
              <li>No single party sees your data</li>
              <li>Encrypted state on blockchain</li>
              <li>Cryptographic guarantees, not promises</li>
              <li>No central honeypot to breach</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Collapsible Tech Specs */}
      <section className={`collapsible ${techSpecsOpen ? "open" : ""}`}>
        <div
          className="collapsible-header"
          onClick={() => setTechSpecsOpen(!techSpecsOpen)}
        >
          <span className="collapsible-title">Under the Hood (For Developers)</span>
          <span className="collapsible-icon">▼</span>
        </div>
        <div className="collapsible-content">
          <p style={{ marginBottom: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Blind-Link is built on cutting-edge cryptographic protocols and
            decentralized infrastructure:
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="tech-badge">Solana Devnet</span>
            <span className="tech-badge">Arcium MXE</span>
            <span className="tech-badge">Cerberus Protocol</span>
            <span className="tech-badge">N-1 Dishonest Majority</span>
            <span className="tech-badge">PSI (Private Set Intersection)</span>
            <span className="tech-badge">Salted SHA-256</span>
            <span className="tech-badge">Rescue Cipher</span>
            <span className="tech-badge">Web Workers</span>
          </div>
          <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Learn more in the{" "}
            <Link to="/how-it-works">How It Works</Link> section.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Landing;
