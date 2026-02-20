import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";

export const Landing: React.FC = () => {
  const { connected } = useWallet();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Private contact discovery powered by Arcium confidential computing.
        </p>
      </div>

      {/* Status cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MXE Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">MXE Cluster</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Offline
            </span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100">Demo Mode</p>
          <p className="text-xs text-zinc-500 mt-1">Local PSI simulation active. MXE nodes not processing.</p>
        </div>

        {/* Registry */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Registry</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Encrypted
            </span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100">64 slots</p>
          <p className="text-xs text-zinc-500 mt-1">4 buckets x 16 slots. MXE-encrypted on Solana.</p>
        </div>

        {/* Network */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Network</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Devnet
            </span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100">Solana</p>
          <p className="text-xs text-zinc-500 mt-1">Cerberus MPC — N-1 dishonest majority tolerance.</p>
        </div>
      </div>

      {/* Quick actions */}
      {connected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/register"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-5 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">Register Identity</h3>
            </div>
            <p className="text-xs text-zinc-500">
              Add your contact identifier to the encrypted global registry. Your data is hashed locally before encryption.
            </p>
            <span className="inline-flex items-center gap-1 mt-3 text-xs text-blue-400/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Data stays on your device
            </span>
          </Link>
          <Link
            to="/discover"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-5 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center text-green-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">Discover Contacts</h3>
            </div>
            <p className="text-xs text-zinc-500">
              Find which of your contacts are registered without revealing your address book to anyone.
            </p>
            <span className="inline-flex items-center gap-1 mt-3 text-xs text-green-400/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Zero-knowledge intersection
            </span>
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
          <p className="text-sm text-zinc-400">Connect your wallet to access Registry and Discovery.</p>
        </div>
      )}

      {/* Privacy Architecture */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Privacy Architecture</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Party</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Sees</th>
                <th className="text-left py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">Cannot See</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="border-b border-zinc-800/50">
                <td className="py-2.5 pr-4 font-medium text-zinc-300">Your Browser</td>
                <td className="py-2.5 pr-4 text-zinc-400">Contacts before hashing</td>
                <td className="py-2.5 text-zinc-500">Nothing leaves unencrypted</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2.5 pr-4 font-medium text-zinc-300">MXE Nodes</td>
                <td className="py-2.5 pr-4 text-zinc-400">Encrypted secret shares only</td>
                <td className="py-2.5 text-zinc-500">Cannot reconstruct plaintext</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2.5 pr-4 font-medium text-zinc-300">Solana Chain</td>
                <td className="py-2.5 pr-4 text-zinc-400">Encrypted ciphertexts</td>
                <td className="py-2.5 text-zinc-500">Zero plaintext data</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-green-400">You</td>
                <td className="py-2.5 pr-4 text-green-400/80">Match flags only</td>
                <td className="py-2.5 text-zinc-500">Non-matches stay hidden</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tech stack badges */}
      <div className="flex flex-wrap gap-2">
        {["Solana Devnet", "Arcium MXE", "Cerberus MPC", "N-1 Dishonest Majority", "Private Set Intersection"].map((t) => (
          <span key={t} className="text-xs text-zinc-500 px-2 py-1 rounded border border-zinc-800 bg-zinc-900">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};
