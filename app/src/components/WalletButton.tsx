import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet, LogOut } from "lucide-react";

export const WalletButton: React.FC = () => {
  const { publicKey, wallet, connect, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = async () => {
    if (!wallet) { setVisible(true); return; }
    await connect();
  };

  if (publicKey) {
    const addr = publicKey.toBase58();
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#27272a] bg-[#121215]">
          <span className="w-[6px] h-[6px] rounded-full bg-green-500 pulse-dot" />
          <span className="font-mono text-[11px] text-zinc-400">
            {addr.slice(0, 4)}...{addr.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 text-zinc-600 hover:text-zinc-400 rounded-md hover:bg-zinc-800/40 transition-colors"
          title="Disconnect"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-arcium hover:bg-arcium/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
    >
      <Wallet size={13} />
      {connecting ? "Connecting..." : "Connect"}
    </button>
  );
};
