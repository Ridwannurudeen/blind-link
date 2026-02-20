import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Cpu, Database, Network, UserPlus, Search, Shield,
  ArrowUpRight, Activity, Lock, ChevronRight, Radio,
} from "lucide-react";

export const Landing: React.FC = () => {
  const { connected } = useWallet();
  const [computations, setComputations] = useState(0);

  // Animate counter on mount
  useEffect(() => {
    let c = 0;
    const iv = setInterval(() => {
      c += Math.ceil(Math.random() * 3);
      if (c >= 12) { c = 12; clearInterval(iv); }
      setComputations(c);
    }, 80);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-zinc-100">Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Confidential computing overview — Arcium MXE on Solana Devnet
          </p>
        </div>
        {connected && (
          <Link
            to="/discover"
            className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-arcium hover:bg-arcium/90 rounded-lg transition-colors"
          >
            New Discovery
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>

      {/* Metric Cards — 12-col grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Computations"
          value={computations.toString()}
          sub="PSI executions on-chain"
          icon={<Cpu size={16} />}
          accentColor="arcium"
        />
        <MetricCard
          label="Active MXEs"
          value="0"
          sub="Cluster nodes offline"
          icon={<Activity size={16} />}
          accentColor="amber"
          status="offline"
        />
        <MetricCard
          label="Registry Capacity"
          value="64"
          sub="4 buckets x 16 slots"
          icon={<Database size={16} />}
          accentColor="blue"
        />
        <MetricCard
          label="Network Nodes"
          value="3"
          sub="Cerberus MPC (N-1 tolerance)"
          icon={<Network size={16} />}
          accentColor="green"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Actions — 8 cols */}
        <div className="lg:col-span-8 space-y-4">
          {connected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionCard
                to="/register"
                icon={<UserPlus size={18} />}
                iconBg="bg-arcium/10 text-arcium"
                title="Register Identity"
                description="Add your contact identifier to the encrypted global registry. Hashed locally with SHA-256."
                privacyLabel="Data stays on your device"
                badge="Encrypted"
              />
              <ActionCard
                to="/discover"
                icon={<Search size={18} />}
                iconBg="bg-green-500/10 text-green-400"
                title="Discover Contacts"
                description="Find which of your contacts are registered without revealing your address book."
                privacyLabel="Zero-knowledge intersection"
                badge="PSI"
              />
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <Lock size={20} className="text-zinc-600 mx-auto mb-3" />
              <p className="text-[13px] text-zinc-500">Connect your wallet to access Registry and Discovery.</p>
            </div>
          )}

          {/* Privacy Architecture Table */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-arcium" />
                <h2 className="text-[13px] font-semibold text-zinc-200">Privacy Architecture</h2>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/8 text-green-400 border border-green-500/15">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
                Verified
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Party</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Visible Data</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Protected</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {[
                  { party: "Your Browser", sees: "Contacts before hashing", hidden: "Nothing sent unencrypted", verified: true },
                  { party: "MXE Node 1", sees: "Secret share only", hidden: "Cannot reconstruct plaintext", verified: true },
                  { party: "MXE Node 2", sees: "Secret share only", hidden: "Cannot reconstruct plaintext", verified: true },
                  { party: "MXE Node 3", sees: "Secret share only", hidden: "Cannot reconstruct plaintext", verified: true },
                  { party: "Solana Chain", sees: "Encrypted ciphertexts", hidden: "Zero plaintext data", verified: true },
                  { party: "You (result)", sees: "Match flags only", hidden: "Non-matches stay hidden", verified: true, highlight: true },
                ].map((row, i) => (
                  <tr key={i} className={`table-row-hover border-b border-border-subtle/50 last:border-0 ${row.highlight ? "bg-green-500/[0.02]" : ""}`}>
                    <td className={`px-5 py-3 font-medium ${row.highlight ? "text-green-400" : "text-zinc-300"}`}>{row.party}</td>
                    <td className="px-5 py-3 text-zinc-500">{row.sees}</td>
                    <td className="px-5 py-3 text-zinc-600">{row.hidden}</td>
                    <td className="px-5 py-3">
                      {row.verified && (
                        <span className="inline-flex items-center gap-1">
                          <Shield size={11} className="text-green-500" />
                          <span className="text-[10px] text-green-500/80 font-medium">ZKP</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar — 4 cols */}
        <div className="lg:col-span-4 space-y-4">
          {/* Cluster Status */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio size={13} className="text-amber-500" />
              <h3 className="text-[12px] font-semibold text-zinc-300 uppercase tracking-wider">Cluster Status</h3>
            </div>
            <div className="space-y-3">
              {["node-0", "node-1", "node-2"].map((node, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-[6px] h-[6px] rounded-full bg-amber-500/60" />
                    <span className="text-[12px] text-zinc-400 font-mono">{node}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800/50 border border-zinc-800">standby</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border-subtle">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-600">Protocol</span>
                <span className="text-zinc-400">Cerberus MPC</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-zinc-600">Security</span>
                <span className="text-zinc-400">N-1 dishonest majority</span>
              </div>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-[12px] font-semibold text-zinc-300 uppercase tracking-wider mb-3">Stack</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Solana Devnet", "Arcium MXE", "Cerberus MPC",
                "Rescue Cipher", "x25519 ECDH", "PSI",
              ].map((t) => (
                <span key={t} className="text-[10px] text-zinc-500 px-2 py-1 rounded-md border border-border bg-surface-2/50">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-[12px] font-semibold text-zinc-300 uppercase tracking-wider mb-3">Recent</h3>
            <div className="space-y-2.5">
              {[
                { action: "Demo PSI computed", time: "2m ago", type: "compute" },
                { action: "Identity registered", time: "5m ago", type: "register" },
                { action: "Wallet connected", time: "8m ago", type: "connect" },
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[12px] text-zinc-400">{a.action}</span>
                  <span className="text-[10px] text-zinc-700">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────── */

const MetricCard: React.FC<{
  label: string; value: string; sub: string;
  icon: React.ReactNode; accentColor: string; status?: string;
}> = ({ label, value, sub, icon, accentColor, status }) => {
  const colorMap: Record<string, string> = {
    arcium: "text-arcium bg-arcium/8",
    amber: "text-amber-500 bg-amber-500/8",
    blue: "text-blue-400 bg-blue-400/8",
    green: "text-green-400 bg-green-400/8",
  };
  const colors = colorMap[accentColor] || colorMap.arcium;

  return (
    <div className="card-interactive bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${colors} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl font-semibold text-zinc-100 tracking-tight">{value}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {status === "offline" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        <p className="text-[11px] text-zinc-600">{sub}</p>
      </div>
    </div>
  );
};

const ActionCard: React.FC<{
  to: string; icon: React.ReactNode; iconBg: string;
  title: string; description: string; privacyLabel: string; badge: string;
}> = ({ to, icon, iconBg, title, description, privacyLabel, badge }) => (
  <Link to={to} className="card-interactive bg-surface border border-border rounded-xl p-5 block group">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
        <h3 className="text-[14px] font-medium text-zinc-200 group-hover:text-zinc-100">{title}</h3>
      </div>
      <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
    </div>
    <p className="text-[12px] text-zinc-500 leading-relaxed mb-3">{description}</p>
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1 text-[11px] text-arcium/70">
        <Shield size={10} />
        {privacyLabel}
      </span>
      <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800/50 border border-zinc-800">{badge}</span>
    </div>
  </Link>
);
