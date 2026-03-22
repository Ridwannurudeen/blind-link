import React from "react";
import { Link } from "react-router-dom";
import { ParticleNetwork } from "../components/ParticleNetwork";
import { AutoDemo } from "../components/AutoDemo";
import { ArchitectureDiagram } from "../components/ArchitectureDiagram";
import { PrivacyShield } from "../components/PrivacyShield";

export const Landing: React.FC = () => {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <ParticleNetwork className="hero-particles" />
        <div className="hero-content">
          <span className="hero-badge">Private Set Intersection on Arcium MXE</span>
          <h1>
            Find Your Contacts.<br />
            <span className="hero-gradient-text">Reveal Nothing.</span>
          </h1>
          <p className="hero-desc">
            Discover which of your contacts are already on the platform — without
            revealing your address book to anyone. Powered by multi-party computation,
            not promises.
          </p>
          <div className="hero-actions">
            <a href="#demo" className="btn-primary">Try It Now</a>
            <a
              href="https://www.loom.com/share/8ca7302dc3d7478abde4ee873130c424"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">&lt; 15s</span>
          <span className="stat-label">Computation</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">3</span>
          <span className="stat-label">MPC Nodes</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">N-1</span>
          <span className="stat-label">Dishonest Majority</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">~0.002</span>
          <span className="stat-label">SOL per Query</span>
        </div>
      </section>

      {/* Auto Demo */}
      <section id="demo" className="demo-section">
        <AutoDemo />
      </section>

      {/* Architecture */}
      <section className="arch-section">
        <h2 className="section-heading">How Your Data Flows</h2>
        <p className="section-desc">
          Every piece of data is transformed before it leaves your device.
          No single party ever sees your contacts.
        </p>
        <ArchitectureDiagram />
      </section>

      {/* Why Arcium */}
      <section className="why-section">
        <h2 className="section-heading">Why This Works</h2>
        <p className="section-desc">
          Traditional apps require you to trust a company. We replaced that trust with mathematics.
        </p>
        <div className="comparison-grid">
          <div className="comparison-card comparison-bad">
            <h4>Trusted Server</h4>
            <ul>
              <li>Server sees all contacts</li>
              <li>Central database (breach risk)</li>
              <li>Trust the company</li>
            </ul>
          </div>
          <div className="comparison-card comparison-bad">
            <h4>ZK Proofs</h4>
            <ul>
              <li>Proves about data, can't compute on it</li>
              <li>Single-party only</li>
              <li>No two-party PSI</li>
            </ul>
          </div>
          <div className="comparison-card comparison-bad">
            <h4>TEEs (SGX/TDX)</h4>
            <ul>
              <li>Hardware trust assumption</li>
              <li>Side-channel attacks</li>
              <li>Intel dependency</li>
            </ul>
          </div>
          <div className="comparison-card comparison-good animated-border">
            <h4>Blind-Link + Arcium</h4>
            <ul>
              <li>No party sees plaintext</li>
              <li>N-1 dishonest majority tolerance</li>
              <li>Information-theoretic security</li>
              <li>Per-session forward secrecy</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy Shield */}
      <section className="shield-section">
        <h2 className="section-heading">Defense in Depth</h2>
        <p className="section-desc">
          Four layers of cryptographic protection stand between your data and anyone else.
        </p>
        <PrivacyShield />
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="card card-glow">
          <h2>Ready to Try?</h2>
          <p className="section-desc">
            No wallet required. Run the demo with real SHA-256 hash matching — locally, privately.
          </p>
          <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
            <Link to="/discover" className="btn-primary">Start Discovery</Link>
            <a
              href="https://github.com/Ridwannurudeen/blind-link"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
