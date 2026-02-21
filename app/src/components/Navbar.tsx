import React from "react";
import { Link, useLocation } from "react-router-dom";
import { WalletButton } from "./WalletButton";
import { useTheme } from "../App";

const SunIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ArciumLogo: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L4 28h6l2-4.5h8L22 28h6L16 2zm0 9l3.5 8h-7L16 11z" fill="url(#arcium-grad)" />
    <defs>
      <linearGradient id="arcium-grad" x1="4" y1="2" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5e60ce" />
        <stop offset="1" stopColor="#ff6b6b" />
      </linearGradient>
    </defs>
  </svg>
);

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

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
      <div className="nav-actions">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
        <WalletButton />
      </div>
    </nav>
  );
};
