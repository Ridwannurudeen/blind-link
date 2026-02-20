import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export const WalletButton: React.FC = () => {
  const { publicKey, wallet, connect, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    await connect();
  };

  if (publicKey) {
    const addr = publicKey.toBase58();
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
          {addr.slice(0, 4)}...{addr.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
};
