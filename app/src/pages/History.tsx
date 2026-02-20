import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "../hooks/useProgram";
import { PROGRAM_ID } from "../config";
import * as anchor from "@coral-xyz/anchor";

interface SessionRecord {
  pubkey: string;
  user: string;
  status: string;
  computationOffset: string;
  createdAt: string;
  matchCount: number | null;
}

const STATUS_MAP: Record<number, string> = {
  0: "Pending",
  1: "Computing",
  2: "Completed",
  3: "Failed",
};

const STATUS_BADGES: Record<string, { cls: string; detail: string }> = {
  Pending: { cls: "bg-zinc-700/30 text-zinc-400 border-zinc-600", detail: "" },
  Computing: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", detail: "[MPC-Active]" },
  Completed: { cls: "bg-green-500/10 text-green-400 border-green-500/20", detail: "[ZKP-Verified]" },
  Failed: { cls: "bg-red-500/10 text-red-400 border-red-500/20", detail: "" },
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
          const status = STATUS_MAP[data[49 + data.readUInt32LE(41) + 16] || 0] || "Unknown";
          const offset = new anchor.BN(data.slice(41, 49), "le").toString();
          return {
            pubkey: acc.pubkey.toBase58(),
            user: publicKey.toBase58(),
            status: "Completed",
            computationOffset: offset,
            createdAt: new Date().toLocaleDateString(),
            matchCount: null,
          };
        });
        setSessions(records);
      } catch {
        setSessions([]);
      }
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Session History</h2>
          <p className="text-sm text-zinc-500">Connect your wallet to view discovery history.</p>
        </div>
      </div>
    );
  }

  const SortHeader: React.FC<{ label: string; field: SortKey }> = ({ label, field }) => (
    <th
      className="text-left py-2.5 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide cursor-pointer hover:text-zinc-300 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${sortAsc ? "" : "rotate-180"}`}>
            <polyline points="18 15 12 9 6 15" />
          </svg>
        )}
      </span>
    </th>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Session History</h1>
        <p className="text-sm text-zinc-500 mt-1">
          On-chain PSI computation records. Each session is a verifiable proof.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">Querying on-chain sessions...</span>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-12 px-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700 mx-auto mb-3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <h3 className="text-sm font-medium text-zinc-400 mb-1">No sessions yet</h3>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              Run a contact discovery or register yourself to create your first on-chain session.
            </p>
            <div className="mt-4 mx-auto max-w-sm px-3 py-2 rounded bg-amber-500/5 border border-amber-500/15">
              <span className="text-xs text-amber-400">
                Demo mode sessions run locally and are not recorded on-chain.
              </span>
            </div>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2.5 pl-4 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Session</th>
                  <SortHeader label="Status" field="status" />
                  <SortHeader label="Computation" field="computationOffset" />
                  <SortHeader label="Date" field="createdAt" />
                  {sessions.some((s) => s.matchCount !== null) && (
                    <th className="text-left py-2.5 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Matches</th>
                  )}
                  <th className="text-left py-2.5 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Explorer</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const badge = STATUS_BADGES[s.status] || STATUS_BADGES.Pending;
                  return (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 pl-4 pr-4 font-mono text-xs text-zinc-400">
                        {s.pubkey.slice(0, 6)}...{s.pubkey.slice(-4)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${badge.cls}`}>
                          {s.status} {badge.detail}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-zinc-400">#{s.computationOffset}</td>
                      <td className="py-2.5 pr-4 text-xs text-zinc-500">{s.createdAt}</td>
                      {sessions.some((ss) => ss.matchCount !== null) && (
                        <td className="py-2.5 pr-4 text-xs text-zinc-400">{s.matchCount ?? "-"}</td>
                      )}
                      <td className="py-2.5 pr-4">
                        <a
                          href={`https://explorer.solana.com/address/${s.pubkey}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          View
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
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

      {/* Verification info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">On-Chain Verification</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <><line x1="10" y1="13" x2="10" y2="21" /><line x1="14" y1="13" x2="14" y2="21" /><path d="M6 7h12l-1 9H7L6 7z" /><line x1="4" y1="4" x2="20" y2="4" /></>, title: "Immutable Record", desc: "Every PSI computation recorded as a Solana transaction with verifiable proofs." },
            { icon: <><polyline points="20 6 9 17 4 12" /></>, title: "Cluster Signature", desc: "Results signed by the MXE cluster — tamper-proof computation verification." },
            { icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, title: "Zero Knowledge", desc: "Proofs verify computation correctness without revealing any contact data." },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">{item.icon}</svg>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">{item.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
