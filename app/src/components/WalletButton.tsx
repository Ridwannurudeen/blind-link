import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export const WalletButton: React.FC = () => {
  const { publicKey, wallet, connect, disconnect, connecting } = useWallet();

  if (publicKey) {
    const addr = publicKey.toBase58();
    return (
      <div className="wallet-connected">
        <span className="wallet-address">
          {addr.slice(0, 4)}...{addr.slice(-4)}
        </span>
        <button className="btn-secondary btn-sm" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn-primary btn-sm"
      onClick={() => connect()}
      disabled={connecting}
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
};
