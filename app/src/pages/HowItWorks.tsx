import React, { useState, useEffect } from "react";

type Stage = "idle" | "hash" | "encrypt" | "compute" | "decrypt" | "done";

const STAGES: { key: Stage; label: string; duration: number }[] = [
  { key: "hash", label: "Local Hash", duration: 1200 },
  { key: "encrypt", label: "Encrypt", duration: 800 },
  { key: "compute", label: "MXE Compute", duration: 2000 },
  { key: "decrypt", label: "Decrypt", duration: 800 },
  { key: "done", label: "Result", duration: 0 },
];

const SAMPLE_CONTACTS = ["alice@example.com", "bob@pm.me", "+1-555-0199"];
const SAMPLE_HASHES = ["a9f3e2...", "7bc41d...", "d0e8f5..."];
const SAMPLE_CIPHER = ["Enc(0x7a2f...)", "Enc(0x3d1c...)", "Enc(0xe9b4...)"];
const SAMPLE_SHARES = ["Share_1", "Share_2", "Share_3"];
const SAMPLE_RESULTS = [
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
  const stageNum = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Protocol</h1>
        <p className="text-sm text-zinc-500 mt-1">
          How data transforms through each privacy layer — from plaintext to encrypted MPC and back.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-6">
        {/* Stage progress */}
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => {
            const isComplete = i < stageNum;
            const isCurrent = i === stageNum;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div className={`flex-1 h-px ${isComplete ? "bg-green-500" : "bg-zinc-700"}`} />}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                    isComplete ? "bg-green-500/10 border-green-500/30 text-green-400" :
                    isCurrent ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                    "bg-zinc-800 border-zinc-700 text-zinc-500"
                  }`}>
                    {isComplete ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide whitespace-nowrap ${
                    isCurrent ? "text-blue-400" : isComplete ? "text-green-400" : "text-zinc-600"
                  }`}>{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Data flow visualization */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
          {/* Your Device */}
          <div className={`border rounded-lg p-4 transition-colors ${
            stage === "hash" ? "border-blue-500/30 bg-blue-500/5" : "border-zinc-800 bg-zinc-800/30"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Your Device</span>
            </div>
            <div className="space-y-1.5 min-h-[80px]">
              {stage === "idle" && SAMPLE_CONTACTS.map((c, i) => (
                <div key={i} className="px-2 py-1 rounded text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20">{c}</div>
              ))}
              {stage === "hash" && SAMPLE_HASHES.map((h, i) => (
                <div key={i} className="px-2 py-1 rounded text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">{h}</div>
              ))}
              {(stage === "encrypt" || stage === "compute") && SAMPLE_CIPHER.map((c, i) => (
                <div key={i} className="px-2 py-1 rounded text-xs font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">{c}</div>
              ))}
              {(stage === "decrypt" || stage === "done") && SAMPLE_RESULTS.map((r, i) => (
                <div key={i} className={`px-2 py-1 rounded text-xs font-mono border ${
                  r.match ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                }`}>{r.contact} {r.match ? "Match" : "No match"}</div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">
              {stage === "idle" ? "Plaintext contacts" :
               stage === "hash" ? "SHA-256 hashes (truncated to u128)" :
               (stage === "encrypt" || stage === "compute") ? "Rescue cipher encrypted" :
               "Match flags decrypted locally"}
            </p>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-colors ${
              ["encrypt", "compute"].includes(stage) ? "text-violet-400" : "text-zinc-700"
            }`}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </div>

          {/* Arcium MXE */}
          <div className={`border rounded-lg p-4 transition-colors ${
            stage === "compute" ? "border-violet-500/30 bg-violet-500/5" : "border-zinc-800 bg-zinc-800/30"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Arcium MXE (3 Nodes)</span>
            </div>
            <div className="space-y-1.5 min-h-[80px]">
              {["idle", "hash", "encrypt"].includes(stage) && (
                <p className="text-xs text-zinc-600 italic">Waiting for encrypted input...</p>
              )}
              {stage === "compute" && (
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_SHARES.map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[10px] text-zinc-500 mb-1">Node {i + 1}</p>
                      <div className="px-2 py-1 rounded text-xs font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">{s}</div>
                    </div>
                  ))}
                </div>
              )}
              {(stage === "decrypt" || stage === "done") && (
                <p className="text-xs text-zinc-600 italic">Computation complete — shares destroyed</p>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">
              {stage === "compute" ? "Each node sees only its secret share" : "No single node sees plaintext"}
            </p>
          </div>
        </div>

        {/* Demo button */}
        <div className="text-center">
          {stage === "idle" ? (
            <button onClick={startDemo} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors">
              Run Flow Demo
            </button>
          ) : stage === "done" ? (
            <button onClick={reset} className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
              Replay
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-3 h-3 border border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
              Running...
            </span>
          )}
        </div>
      </div>

      {/* Privacy Scorecard */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Privacy Scorecard</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Party</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Visible Data</th>
                <th className="text-left py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">Protected</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {[
                { party: "Your Browser", sees: "Contacts before hashing", hidden: "Nothing sent unencrypted" },
                { party: "MXE Node 1", sees: "Share_1 only", hidden: "Cannot reconstruct data" },
                { party: "MXE Node 2", sees: "Share_2 only", hidden: "Cannot reconstruct data" },
                { party: "MXE Node 3", sees: "Share_3 only", hidden: "Cannot reconstruct data" },
                { party: "On-Chain", sees: "Encrypted ciphertexts", hidden: "Zero plaintext ever", highlight: true },
              ].map((row, i) => (
                <tr key={i} className={`border-b border-zinc-800/50 ${row.highlight ? "bg-green-500/5" : ""}`}>
                  <td className={`py-2.5 pr-4 font-medium ${row.highlight ? "text-green-400" : "text-zinc-300"}`}>{row.party}</td>
                  <td className="py-2.5 pr-4 text-zinc-400">{row.sees}</td>
                  <td className="py-2.5 text-zinc-500">{row.hidden}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-600 mt-3 italic">
          Cerberus MPC protocol — secure even if N-1 nodes are malicious. Only 1 honest node required.
        </p>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-red-500/15 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3">Traditional Approach</h3>
          <ul className="space-y-2 text-xs text-zinc-400">
            {["Uploads full address book to server", "Server sees all your contacts", "Stored in central database (breach risk)", "\"Trust us\" — no cryptographic proof"].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 mt-0.5 flex-shrink-0"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-zinc-900 border border-green-500/15 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-3">Blind-Link (Arcium MPC)</h3>
          <ul className="space-y-2 text-xs text-zinc-400">
            {["Contacts hashed locally, never uploaded", "No single party sees your data", "Encrypted state on Solana (no honeypot)", "Cerberus MPC — cryptographic proof"].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400 mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
