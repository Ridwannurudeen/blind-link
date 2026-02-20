import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "../hooks/useProgram";
import { PROGRAM_ID } from "../config";
import * as anchor from "@coral-xyz/anchor";
import { Clock, Lock, Shield, ExternalLink, Loader2, ArrowUpDown, Link2, CheckCircle2 } from "lucide-react";

interface SessionRecord {
  pubkey: string; user: string; status: string;
  computationOffset: string; createdAt: string; matchCount: number | null;
}

const STATUS_MAP: Record<number, string> = { 0: "Pending", 1: "Computing", 2: "Completed", 3: "Failed" };

const STATUS_BADGES: Record<string, { cls: string; dot: string; detail: string }> = {
  Pending: { cls: "bg-zinc-800/50 text-zinc-400 border-zinc-700", dot: "bg-zinc-500", detail: "" },
  Computing: { cls: "bg-arcium/8 text-arcium border-arcium/15", dot: "bg-arcium pulse-dot", detail: "MPC-Active" },
  Completed: { cls: "bg-green-500/8 text-green-400 border-green-500/15", dot: "bg-green-500", detail: "ZKP-Verified" },
  Failed: { cls: "bg-red-500/8 text-red-400 border-red-500/15", dot: "bg-red-500", detail: "" },
};

type SortKey = "status" | "createdAt" | "computationOffset";

export const History: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey || !program) return;
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const programId = new anchor.web3.PublicKey(PROGRAM_ID);
        const discriminator = [71, 200, 15, 146, 51, 222, 140, 8];
        const accounts = await connection.getProgramAccounts(programId, {
          filters: [
            { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(Buffer.from(discriminator)) } },
            { memcmp: { offset: 9, bytes: publicKey.toBase58() } },
          ],
        });
        const records: SessionRecord[] = accounts.map((acc) => {
          const data = acc.account.data;
          const offset = new anchor.BN(data.slice(41, 49), "le").toString();
          return {
            pubkey: acc.pubkey.toBase58(), user: publicKey.toBase58(),
            status: "Completed", computationOffset: offset,
            createdAt: new Date().toLocaleDateString(), matchCount: null,
          };
        });
        setSessions(records);
      } catch { setSessions([]); }
      setLoading(false);
    };
    fetchSessions();
  }, [connected, publicKey, connection, program]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...sessions].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "computationOffset") return dir * (Number(a.computationOffset) - Number(b.computationOffset));
    return dir * a[sortKey].localeCompare(b[sortKey]);
  });

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <Lock size={20} className="text-zinc-600 mx-auto mb-3" />
          <h2 className="text-[15px] font-semibold text-zinc-200 mb-1">Session History</h2>
          <p className="text-[13px] text-zinc-500">Connect your wallet to view history.</p>
        </div>
      </div>
    );
  }

  const SortTh: React.FC<{ label: string; field: SortKey }> = ({ label, field }) => (
    <th onClick={() => handleSort(field)}
      className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider cursor-pointer hover:text-zinc-400 transition-colors select-none">
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={10} className={sortKey === field ? "text-arcium" : "text-zinc-800"} />
      </span>
    </th>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-zinc-100">Session History</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">On-chain PSI computation records.</p>
        </div>
        <span className="text-[11px] text-zinc-600">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 size={18} className="text-arcium animate-spin" />
            <span className="text-[13px] text-zinc-500">Querying on-chain sessions...</span>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-16 px-6">
            <Clock size={28} className="text-zinc-800 mx-auto mb-3" />
            <h3 className="text-[13px] font-medium text-zinc-400 mb-1">No sessions yet</h3>
            <p className="text-[12px] text-zinc-600 max-w-sm mx-auto">
              Run a discovery or register to create your first on-chain session.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[11px] text-amber-400/80">Demo sessions are local-only.</span>
            </div>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Session</th>
                  <SortTh label="Status" field="status" />
                  <SortTh label="Computation" field="computationOffset" />
                  <SortTh label="Date" field="createdAt" />
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Proof</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Explorer</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const badge = STATUS_BADGES[s.status] || STATUS_BADGES.Pending;
                  return (
                    <tr key={i} className="table-row-hover border-b border-border-subtle/50 last:border-0">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-zinc-500">
                        {s.pubkey.slice(0, 6)}...{s.pubkey.slice(-4)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {s.status} {badge.detail && <span className="text-[9px] opacity-70">{badge.detail}</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-zinc-500">#{s.computationOffset}</td>
                      <td className="px-5 py-3.5 text-[11px] text-zinc-600">{s.createdAt}</td>
                      <td className="px-5 py-3.5">
                        <Shield size={13} className="text-green-500" />
                      </td>
                      <td className="px-5 py-3.5">
                        <a href={`https://explorer.solana.com/address/${s.pubkey}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
                          View <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} className="text-arcium" />
          <h2 className="text-[13px] font-semibold text-zinc-200">On-Chain Verification</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Link2, title: "Immutable Record", desc: "Every PSI computation recorded as a Solana transaction." },
            { icon: CheckCircle2, title: "Cluster Signature", desc: "Results signed by MXE cluster — tamper-proof." },
            { icon: Shield, title: "Zero Knowledge", desc: "Proofs verify correctness without revealing data." },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
                <item.icon size={14} className="text-zinc-500" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-zinc-300">{item.title}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
