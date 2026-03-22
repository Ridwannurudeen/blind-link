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
                <footer>
                  <p>
                    Built on{" "}
                    <a href="https://arcium.com" target="_blank" rel="noopener noreferrer">
                      Arcium
                    </a>{" "}
                    +{" "}
                    <a href="https://solana.com" target="_blank" rel="noopener noreferrer">
                      Solana
                    </a>
                  </p>
                </footer>
              </div>
            </BrowserRouter>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeContext.Provider>
  );
}
