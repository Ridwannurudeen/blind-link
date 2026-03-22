import React, { useMemo, createContext, useContext, useEffect, Suspense, lazy } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { SOLANA_RPC } from "./config";

import "@solana/wallet-adapter-react-ui/styles.css";

const Landing = lazy(() => import("./pages/Landing"));
const Register = lazy(() => import("./pages/Register"));
const Discovery = lazy(() => import("./pages/Discovery"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const History = lazy(() => import("./pages/History"));

type Theme = "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function App() {
  const wallets = useMemo(() => [], []);

  const theme: Theme = "dark";
  const toggleTheme = () => {};

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ConnectionProvider endpoint={SOLANA_RPC}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <BrowserRouter>
              <div className="app">
                <Navbar />
                <main>
                  <Suspense fallback={<div className="page-loading">Loading...</div>}>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/discover" element={<Discovery />} />
                      <Route path="/how-it-works" element={<HowItWorks />} />
                      <Route path="/history" element={<History />} />
                    </Routes>
                  </Suspense>
                </main>
                <footer className="footer">
                  <div className="footer-links">
                    <a
                      href="https://github.com/Ridwannurudeen/blind-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      Source Code
                    </a>
                    <a
                      href="https://www.loom.com/share/8ca7302dc3d7478abde4ee873130c424"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Video Demo
                    </a>
                  </div>
                  <div className="footer-badge">
                    <a href="https://arcium.com" target="_blank" rel="noopener noreferrer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--primary)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Built on Arcium
                    </a>
                  </div>
                  <p className="footer-tagline">Built for the Arcium ecosystem</p>
                </footer>
              </div>
            </BrowserRouter>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeContext.Provider>
  );
}
