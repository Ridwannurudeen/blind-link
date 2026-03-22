import React from "react";
import { Link, useLocation } from "react-router-dom";
import { WalletButton } from "./WalletButton";

const LockIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ArciumLogo: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L4 28h6l2-4.5h8L22 28h6L16 2zm0 9l3.5 8h-7L16 11z" fill="url(#arcium-nav)" />
    <defs>
      <linearGradient id="arcium-nav" x1="4" y1="2" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4ff" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

export const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-brand-group">
        <Link to="/" className="nav-brand">
          <LockIcon />
          <span>Blind-Link</span>
        </Link>
        <a
          href="https://arcium.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-arcium-badge"
        >
          <ArciumLogo />
          <span>Built on Arcium</span>
        </a>
      </div>
      <div className="nav-links">
        {[
          { to: "/discover", label: "Discover" },
          { to: "/register", label: "Register" },
          { to: "/how-it-works", label: "How It Works" },
          { to: "/history", label: "History" },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`nav-link ${location.pathname === to ? "active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="nav-actions">
        <WalletButton />
      </div>
    </nav>
  );
};
