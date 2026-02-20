import React from "react";
import { Link, useLocation } from "react-router-dom";
import { WalletButton } from "./WalletButton";

const ArciumLogo: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L4 28h6l2-4.5h8L22 28h6L16 2zm0 9l3.5 8h-7L16 11z" fill="url(#arcium-grad)" />
    <defs>
      <linearGradient id="arcium-grad" x1="4" y1="2" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a29bfe" />
        <stop offset="1" stopColor="#00cec9" />
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
          Blind-Link
        </Link>
        <span className="nav-brand-divider" />
        <a
          href="https://arcium.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-arcium-link"
        >
          <ArciumLogo />
          <span className="nav-arcium-text">Arcium</span>
        </a>
      </div>
      <div className="nav-links">
        <Link
          to="/register"
          className={`nav-link ${location.pathname === "/register" ? "active" : ""}`}
        >
          Register
        </Link>
        <Link
          to="/discover"
          className={`nav-link ${location.pathname === "/discover" ? "active" : ""}`}
        >
          Discover
        </Link>
        <Link
          to="/how-it-works"
          className={`nav-link ${location.pathname === "/how-it-works" ? "active" : ""}`}
        >
          How It Works
        </Link>
        <Link
          to="/history"
          className={`nav-link ${location.pathname === "/history" ? "active" : ""}`}
        >
          History
        </Link>
      </div>
      <WalletButton />
    </nav>
  );
};
