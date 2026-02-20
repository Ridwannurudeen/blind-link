import React, { useState, useCallback, useEffect } from "react";
import { BlindLinkClient, PsiResult, OnboardingCallbacks } from "../services/blind-link-client";

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
    step: "idle",
    hashProgress: { processed: 0, total: 0 },
    result: null,
    error: null,
    demoMode: false,
    mxeChecked: false,
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
        const demoUsers = demoRegisteredUsers || [
          "alice@example.com", "bob@example.com", "carol@example.com",
          "dave@example.com", "eve@example.com",
        ];
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
    ? Math.round((state.hashProgress.processed / state.hashProgress.total) * 100)
    : 0;

  const currentStepIdx = STEPS.findIndex((s) => s.key === state.step);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Private Discovery</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Your address book never leaves your device. Only encrypted hashes are compared.
        </p>
      </div>

      {/* Demo mode indicator */}
      {state.mxeChecked && state.demoMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-amber-500/5 border border-amber-500/15">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-400">Demo mode — local SHA-256 PSI simulation.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isComplete = currentStepIdx > i || state.step === "complete";
          const isActive = s.key === state.step;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`flex-1 h-px mx-1 ${isComplete ? "bg-green-500" : "bg-zinc-700"}`} />}
              <div className="flex flex-col items-center gap-1">
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border
                  ${isComplete ? "bg-green-500/10 border-green-500/30 text-green-400" :
                    isActive ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                    "bg-zinc-800 border-zinc-700 text-zinc-500"}
                `}>
                  {isComplete ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : i + 1}
                </div>
                <span className={`text-[10px] uppercase tracking-wide ${
                  isActive ? "text-blue-400" : isComplete ? "text-green-400" : "text-zinc-600"
                }`}>{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div>
        {state.step === "idle" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-zinc-400">{contacts.length} contacts ready</p>
            <button
              onClick={startOnboarding}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
            >
              Start Private Discovery
            </button>
            <div className="flex items-center justify-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span className="text-xs text-blue-400/70">Zero contacts sent to any server</span>
            </div>
          </div>
        )}

        {state.step === "hashing" && (
          <div className="space-y-3 py-2">
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-sm text-zinc-300 text-center">
              Hashing {state.hashProgress.processed}/{state.hashProgress.total} ({progressPercent}%)
            </p>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                {STEPS[0].privacy}
              </span>
            </div>
          </div>
        )}

        {state.step === "computing" && (
          <div className="text-center py-4 space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-300">Encrypted computation in progress...</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-violet-500/10 text-violet-400">
              {STEPS[1].privacy}
            </span>
            <p className="text-xs text-zinc-600">Cerberus Protocol — Dishonest Majority Security</p>
          </div>
        )}

        {state.step === "revealing" && (
          <div className="text-center py-4 space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-300">Decrypting results...</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">
              {STEPS[2].privacy}
            </span>
          </div>
        )}

        {state.step === "complete" && state.result && (
          <div className="text-center py-4 space-y-3">
            <p className="text-lg font-semibold text-zinc-100">
              {state.result.matchCount} match{state.result.matchCount !== 1 ? "es" : ""}
            </p>
            <p className="text-sm text-zinc-400">
              {state.result.totalChecked} contacts checked privately.
            </p>
            {state.result.matchedContacts.length > 0 && (
              <div className="space-y-1 text-left max-w-sm mx-auto">
                {state.result.matchedContacts.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded text-sm">
                    <span className="font-mono text-xs text-zinc-300">{maskContact(contact)}</span>
                    <span className="text-xs text-green-400">Matched</span>
                  </div>
                ))}
              </div>
            )}
            {state.result.demoMode && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400">
                Demo result — production uses Arcium MPC
              </span>
            )}
            <div>
              <button
                onClick={() => setState((s) => ({ ...s, step: "idle" as const, hashProgress: { processed: 0, total: 0 }, result: null, error: null }))}
                className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {state.step === "error" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-red-400">
              {state.error?.includes("MXE public key")
                ? "Arcium MXE cluster is currently unavailable."
                : state.error?.includes("User rejected")
                ? "Transaction rejected in wallet."
                : state.error?.includes("insufficient")
                ? "Insufficient SOL balance."
                : state.error || "An unexpected error occurred."}
            </p>
            <button
              onClick={startOnboarding}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function maskContact(contact: string): string {
  if (contact.includes("@")) {
    const [local, domain] = contact.split("@");
    return local.slice(0, 2) + "***@" + domain;
  }
  if (contact.length > 6) return contact.slice(0, 3) + "****" + contact.slice(-2);
  return contact.slice(0, 2) + "***";
}

export default BlindOnboarding;
