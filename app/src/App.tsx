import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Register } from "./pages/Register";
import { Discovery } from "./pages/Discovery";
import { HowItWorks } from "./pages/HowItWorks";
import { History } from "./pages/History";
import { SOLANA_RPC } from "./config";

import "@solana/wallet-adapter-react-ui/styles.css";

export default function App() {
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/register" element={<Register />} />
                <Route path="/discover" element={<Discovery />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/history" element={<History />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
