import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";

export const Landing: React.FC = () => {
  const { connected } = useWallet();

  return (
    <div className="landing">
      <section className="hero">
        <h1>Blind-Link</h1>
        <p className="hero-tagline">
          Private Contact Discovery on Arcium
        </p>
        <p className="hero-desc">
          Find which of your contacts are already on the platform — without
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
              Encrypted hashes enter Arcium's Multi-Party Computation network.
              No single node can see your contacts (Cerberus protocol).
            </p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h3>Private Reveal</h3>
            <p>
              Only matched contacts are decrypted client-side.
              Non-matches remain invisible to everyone — forever.
            </p>
          </div>
        </div>
      </section>

      <section className="tech-badges">
        <span className="badge">Solana Devnet</span>
        <span className="badge">Arcium MXE</span>
        <span className="badge">Cerberus Protocol</span>
        <span className="badge">N-1 Dishonest Majority</span>
      </section>
    </div>
  );
};
