import React from "react";
import { Link, useLocation } from "react-router-dom";
import { WalletButton } from "./WalletButton";

export const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        Blind-Link
      </Link>
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
      </div>
      <WalletButton />
    </nav>
  );
};
