import React, { useState, useCallback, useEffect } from "react";
import { BlindLinkClient, PsiResult, OnboardingCallbacks } from "../services/blind-link-client";
import { Shield, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";

type OnboardingStep = "idle" | "hashing" | "computing" | "revealing" | "complete" | "error";

interface BlindOnboardingProps {
  client: BlindLinkClient;
  contacts: string[];
  demoRegisteredUsers?: string[];
  onComplete?: (result: PsiResult) => void;
  onError?: (error: Error) => void;
}

interface StepState {
  step: OnboardingStep;
  hashProgress: { processed: number; total: number };
  result: PsiResult | null;
  error: string | null;
  demoMode: boolean;
  mxeChecked: boolean;
}

const STEPS = [
  { key: "hashing", label: "Local Hash", privacy: "Processing on-device — nothing transmitted" },
  { key: "computing", label: "MXE Compute", privacy: "Encrypted data in MXE — no node sees plaintext" },
  { key: "revealing", label: "Decrypt", privacy: "Decrypted locally — only you see matches" },
] as const;

export const BlindOnboarding: React.FC<BlindOnboardingProps> = ({
  client, contacts, demoRegisteredUsers, onComplete, onError,
}) => {
  const [state, setState] = useState<StepState>({
    step: "idle", hashProgress: { processed: 0, total: 0 },
    result: null, error: null, demoMode: false, mxeChecked: false,
  });

  useEffect(() => {
    client.isMxeAvailable().then((available) => {
      setState((s) => ({ ...s, demoMode: !available, mxeChecked: true }));
    });
  }, [client]);

  const startOnboarding = useCallback(async () => {
    setState((s) => ({ ...s, step: "hashing", error: null }));
    const callbacks: OnboardingCallbacks = {
      onHashProgress: (processed, total) => setState((s) => ({ ...s, hashProgress: { processed, total } })),
      onHashComplete: () => setState((s) => ({ ...s, step: "computing" })),
      onComputeStart: () => setState((s) => ({ ...s, step: "computing" })),
      onComputeComplete: () => setState((s) => ({ ...s, step: "revealing" })),
      onReveal: () => setState((s) => ({ ...s, step: "complete" })),
      onError: (error) => { setState((s) => ({ ...s, step: "error", error: error.message })); onError?.(error); },
    };
    try {
      let result: PsiResult;
      if (state.demoMode) {
        const demoUsers = demoRegisteredUsers || ["alice@example.com", "bob@example.com", "carol@example.com", "dave@example.com", "eve@example.com"];
        result = await client.blindOnboardDemo(contacts, demoUsers, callbacks);
      } else {
        result = await client.blindOnboard(contacts, callbacks);
      }
      setState((s) => ({ ...s, step: "complete", result }));
      onComplete?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((s) => ({ ...s, step: "error", error: error.message }));
      onError?.(error);
    }
  }, [client, contacts, demoRegisteredUsers, state.demoMode, onComplete, onError]);

  const progressPercent = state.hashProgress.total > 0
    ? Math.round((state.hashProgress.processed / state.hashProgress.total) * 100) : 0;
  const currentStepIdx = STEPS.findIndex((s) => s.key === state.step);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-zinc-100">Private Discovery</h2>
        <p className="text-[12px] text-zinc-500 mt-0.5">Your address book never leaves your device.</p>
      </div>

      {state.mxeChecked && state.demoMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
          <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
          <span className="text-[11px] text-amber-400/80">Demo mode — local SHA-256 PSI simulation.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isComplete = currentStepIdx > i || state.step === "complete";
          const isActive = s.key === state.step;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`flex-1 h-px mx-1 ${isComplete ? "bg-green-500/50" : "bg-zinc-800"}`} />}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border transition-colors ${
                  isComplete ? "bg-green-500/10 border-green-500/20 text-green-400" :
                  isActive ? "bg-arcium/10 border-arcium/20 text-arcium" :
                  "bg-zinc-900 border-zinc-800 text-zinc-600"
                }`}>
                  {isComplete ? <CheckCircle2 size={13} /> : i + 1}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${
                  isActive ? "text-arcium" : isComplete ? "text-green-400/70" : "text-zinc-700"
                }`}>{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {state.step === "idle" && (
          <div className="text-center py-6 space-y-4">
            <p className="text-[13px] text-zinc-400">{contacts.length} contacts ready</p>
            <button onClick={startOnboarding}
              className="px-5 py-2.5 text-[13px] font-medium text-white bg-arcium hover:bg-arcium/90 rounded-lg transition-colors">
              Start Private Discovery
            </button>
            <div className="flex items-center justify-center gap-1.5">
              <Lock size={11} className="text-arcium/50" />
              <span className="text-[11px] text-zinc-600">Zero contacts sent to any server</span>
            </div>
          </div>
        )}

        {state.step === "hashing" && (
          <div className="space-y-3 py-4">
            <div className="w-full h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
              <div className="h-full bg-arcium rounded-full transition-all duration-200" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[13px] text-zinc-300 text-center">Hashing {state.hashProgress.processed}/{state.hashProgress.total} ({progressPercent}%)</p>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-arcium/8 text-arcium border border-arcium/15">
                <Shield size={10} /> {STEPS[0].privacy}
              </span>
            </div>
          </div>
        )}

        {state.step === "computing" && (
          <div className="text-center py-6 space-y-3">
            <Loader2 size={24} className="text-arcium animate-spin mx-auto" />
            <p className="text-[13px] text-zinc-300">Encrypted computation in progress...</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-arcium/8 text-arcium border border-arcium/15">
              <Shield size={10} /> {STEPS[1].privacy}
            </span>
            <p className="text-[10px] text-zinc-700">Cerberus Protocol — Dishonest Majority Security</p>
          </div>
        )}

        {state.step === "revealing" && (
          <div className="text-center py-6 space-y-3">
            <Loader2 size={24} className="text-green-400 animate-spin mx-auto" />
            <p className="text-[13px] text-zinc-300">Decrypting results...</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-green-500/8 text-green-400 border border-green-500/15">
              <Shield size={10} /> {STEPS[2].privacy}
            </span>
          </div>
        )}

        {state.step === "complete" && state.result && (
          <div className="text-center py-4 space-y-4">
            <p className="text-xl font-semibold text-zinc-100">{state.result.matchCount} match{state.result.matchCount !== 1 ? "es" : ""}</p>
            <p className="text-[13px] text-zinc-500">{state.result.totalChecked} contacts checked privately.</p>
            {state.result.matchedContacts.length > 0 && (
              <div className="space-y-1 text-left max-w-sm mx-auto">
                {state.result.matchedContacts.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-[#0d0d10] rounded-lg border border-border text-[12px]">
                    <span className="font-mono text-zinc-300">{maskContact(contact)}</span>
                    <span className="inline-flex items-center gap-1 text-green-400">
                      <Shield size={10} /> Verified
                    </span>
                  </div>
                ))}
              </div>
            )}
            {state.result.demoMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/8 text-amber-400 border border-amber-500/15">
                Demo result — production uses Arcium MPC
              </span>
            )}
            <button onClick={() => setState((s) => ({ ...s, step: "idle" as const, hashProgress: { processed: 0, total: 0 }, result: null, error: null }))}
              className="text-[12px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-border hover:border-zinc-600 transition-colors">
              Done
            </button>
          </div>
        )}

        {state.step === "error" && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle size={20} className="text-red-400 mx-auto" />
            <p className="text-[13px] text-red-400">
              {state.error?.includes("MXE public key") ? "MXE cluster unavailable." :
               state.error?.includes("User rejected") ? "Transaction rejected." :
               state.error?.includes("insufficient") ? "Insufficient SOL." :
               state.error || "Unexpected error."}
            </p>
            <button onClick={startOnboarding}
              className="text-[12px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-border hover:border-zinc-600 transition-colors">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function maskContact(contact: string): string {
  if (contact.includes("@")) { const [l, d] = contact.split("@"); return l.slice(0, 2) + "***@" + d; }
  if (contact.length > 6) return contact.slice(0, 3) + "****" + contact.slice(-2);
  return contact.slice(0, 2) + "***";
}

export default BlindOnboarding;
