import React, { useState, useEffect } from "react";
import { Shield, Monitor, Lock, ArrowRight, CheckCircle2, Loader2, Play, RotateCcw } from "lucide-react";

type Stage = "idle" | "hash" | "encrypt" | "compute" | "decrypt" | "done";

const STAGES: { key: Stage; label: string; duration: number }[] = [
  { key: "hash", label: "Hash", duration: 1200 },
  { key: "encrypt", label: "Encrypt", duration: 800 },
  { key: "compute", label: "MXE", duration: 2000 },
  { key: "decrypt", label: "Decrypt", duration: 800 },
  { key: "done", label: "Result", duration: 0 },
];

const CONTACTS = ["alice@example.com", "bob@pm.me", "+1-555-0199"];
const HASHES = ["a9f3e2...", "7bc41d...", "d0e8f5..."];
const CIPHER = ["Enc(0x7a2f…)", "Enc(0x3d1c…)", "Enc(0xe9b4…)"];
const SHARES = ["Share_1", "Share_2", "Share_3"];
const RESULTS = [
  { contact: "alice@example.com", match: true },
  { contact: "bob@pm.me", match: false },
  { contact: "+1-555-0199", match: true },
];

export const HowItWorks: React.FC = () => {
  const [stage, setStage] = useState<Stage>("idle");
  const [stageIdx, setStageIdx] = useState(-1);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || stageIdx < 0) return;
    if (stageIdx >= STAGES.length) { setRunning(false); return; }
    setStage(STAGES[stageIdx].key);
    const dur = STAGES[stageIdx].duration;
    if (dur > 0) {
      const t = setTimeout(() => setStageIdx((i) => i + 1), dur);
      return () => clearTimeout(t);
    }
  }, [stageIdx, running]);

  const startDemo = () => { setStageIdx(0); setRunning(true); };
  const reset = () => { setStage("idle"); setStageIdx(-1); setRunning(false); };
  const sn = STAGES.findIndex((s) => s.key === stage);

  const Chip: React.FC<{ text: string; cls: string }> = ({ text, cls }) => (
    <div className={`px-2.5 py-1 rounded-md text-[11px] font-mono border ${cls}`}>{text}</div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-zinc-100">Protocol</h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">Data transformation through each privacy layer.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`flex-1 h-px ${i < sn ? "bg-green-500/50" : i === sn ? "bg-arcium/50" : "bg-zinc-800"}`} />}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border transition-all ${
                  i < sn ? "bg-green-500/10 border-green-500/20 text-green-400" :
                  i === sn ? "bg-arcium/10 border-arcium/20 text-arcium" :
                  "bg-zinc-900 border-zinc-800 text-zinc-600"
                }`}>
                  {i < sn ? <CheckCircle2 size={13} /> : i + 1}
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-medium ${
                  i === sn ? "text-arcium" : i < sn ? "text-green-400/70" : "text-zinc-700"
                }`}>{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Flow */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_40px_1fr] gap-4 items-stretch">
          <div className={`border rounded-xl p-4 transition-all ${stage === "hash" ? "border-arcium/20 bg-arcium/[0.02]" : "border-border-subtle bg-[#0d0d10]"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Monitor size={13} className="text-zinc-500" />
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Your Device</span>
            </div>
            <div className="space-y-1.5 min-h-[90px]">
              {stage === "idle" && CONTACTS.map((c, i) => <Chip key={i} text={c} cls="bg-red-500/[0.06] text-red-400 border-red-500/15" />)}
              {stage === "hash" && HASHES.map((h, i) => <Chip key={i} text={h} cls="bg-arcium/[0.06] text-arcium border-arcium/15" />)}
              {(stage === "encrypt" || stage === "compute") && CIPHER.map((c, i) => <Chip key={i} text={c} cls="bg-blue-500/[0.06] text-blue-400 border-blue-500/15" />)}
              {(stage === "decrypt" || stage === "done") && RESULTS.map((r, i) => (
                <Chip key={i} text={`${r.contact} ${r.match ? "Match" : "No match"}`}
                  cls={r.match ? "bg-green-500/[0.06] text-green-400 border-green-500/15" : "bg-zinc-800/30 text-zinc-600 border-zinc-800"} />
              ))}
            </div>
            <p className="text-[10px] text-zinc-700 mt-2">
              {stage === "idle" ? "Plaintext contacts" : stage === "hash" ? "SHA-256 hashes (u128)" :
               (stage === "encrypt" || stage === "compute") ? "Rescue cipher encrypted" : "Match flags decrypted locally"}
            </p>
          </div>

          <div className="hidden md:flex items-center justify-center">
            <ArrowRight size={16} className={`transition-colors ${["encrypt", "compute"].includes(stage) ? "text-arcium" : "text-zinc-800"}`} />
          </div>

          <div className={`border rounded-xl p-4 transition-all ${stage === "compute" ? "border-arcium/20 bg-arcium/[0.02]" : "border-border-subtle bg-[#0d0d10]"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Lock size={13} className="text-zinc-500" />
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Arcium MXE</span>
            </div>
            <div className="space-y-1.5 min-h-[90px]">
              {["idle", "hash", "encrypt"].includes(stage) && <p className="text-[11px] text-zinc-700 italic">Waiting for encrypted input...</p>}
              {stage === "compute" && (
                <div className="grid grid-cols-3 gap-2">
                  {SHARES.map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[9px] text-zinc-600 mb-1">Node {i + 1}</p>
                      <Chip text={s} cls="bg-arcium/[0.06] text-arcium border-arcium/15" />
                    </div>
                  ))}
                </div>
              )}
              {(stage === "decrypt" || stage === "done") && <p className="text-[11px] text-zinc-700 italic">Complete — shares destroyed</p>}
            </div>
            <p className="text-[10px] text-zinc-700 mt-2">{stage === "compute" ? "Each node sees only its share" : "No single node sees plaintext"}</p>
          </div>
        </div>

        <div className="text-center">
          {stage === "idle" ? (
            <button onClick={startDemo} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-arcium hover:bg-arcium/90 rounded-lg transition-colors">
              <Play size={13} /> Run Demo
            </button>
          ) : stage === "done" ? (
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-border hover:border-zinc-600 transition-colors">
              <RotateCcw size={12} /> Replay
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-[12px] text-zinc-600">
              <Loader2 size={13} className="animate-spin text-arcium" /> Running...
            </span>
          )}
        </div>
      </div>

      {/* Privacy scorecard */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border-subtle">
          <Shield size={14} className="text-arcium" />
          <h2 className="text-[13px] font-semibold text-zinc-200">Privacy Scorecard</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Party</th>
              <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Visible</th>
              <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Protected</th>
              <th className="text-left px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider w-16">ZKP</th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {[
              { party: "Browser", sees: "Contacts before hashing", hidden: "Nothing sent unencrypted" },
              { party: "Node 1", sees: "Share_1 only", hidden: "Cannot reconstruct" },
              { party: "Node 2", sees: "Share_2 only", hidden: "Cannot reconstruct" },
              { party: "Node 3", sees: "Share_3 only", hidden: "Cannot reconstruct" },
              { party: "On-Chain", sees: "Encrypted ciphertexts", hidden: "Zero plaintext", hl: true },
            ].map((r, i) => (
              <tr key={i} className={`table-row-hover border-b border-border-subtle/50 last:border-0 ${r.hl ? "bg-green-500/[0.015]" : ""}`}>
                <td className={`px-5 py-3 font-medium ${r.hl ? "text-green-400" : "text-zinc-300"}`}>{r.party}</td>
                <td className="px-5 py-3 text-zinc-500">{r.sees}</td>
                <td className="px-5 py-3 text-zinc-600">{r.hidden}</td>
                <td className="px-5 py-3"><Shield size={12} className="text-green-500" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-2.5 border-t border-border-subtle">
          <p className="text-[10px] text-zinc-600 italic">Cerberus MPC — secure with N-1 malicious nodes. Only 1 honest required.</p>
        </div>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Traditional", color: "red", items: ["Uploads full address book", "Server sees all contacts", "Central database (breach risk)", "\"Trust us\" — no proof"] },
          { title: "Blind-Link (MPC)", color: "green", items: ["Hashed locally, never uploaded", "No single party sees data", "Encrypted on Solana", "Cerberus MPC proof"] },
        ].map((card) => (
          <div key={card.title} className={`bg-surface border rounded-xl p-4 ${card.color === "red" ? "border-red-500/10" : "border-green-500/10"}`}>
            <h3 className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${card.color === "red" ? "text-red-400" : "text-green-400"}`}>{card.title}</h3>
            <ul className="space-y-2">
              {card.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-400">
                  {card.color === "red"
                    ? <span className="text-red-400 mt-0.5 text-[10px]">&#10005;</span>
                    : <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
