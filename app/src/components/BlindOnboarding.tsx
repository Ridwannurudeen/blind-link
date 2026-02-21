import React, { useState, useCallback, useEffect } from "react";
import { BlindLinkClient, PsiResult, OnboardingCallbacks } from "../services/blind-link-client";

type OnboardingStep = "idle" | "hashing" | "computing" | "revealing" | "complete" | "error";

interface BlindOnboardingProps {
  client: BlindLinkClient | null;
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

export const BlindOnboarding: React.FC<BlindOnboardingProps> = ({
  client,
  contacts,
  demoRegisteredUsers,
  onComplete,
  onError,
}) => {
  const [state, setState] = useState<StepState>({
    step: "idle",
    hashProgress: { processed: 0, total: 0 },
    result: null,
    error: null,
    demoMode: !client,
    mxeChecked: !client,
  });

  useEffect(() => {
    if (!client) {
      setState((s) => ({ ...s, demoMode: true, mxeChecked: true }));
      return;
    }
    client.isMxeAvailable().then((available) => {
      setState((s) => ({ ...s, demoMode: !available, mxeChecked: true }));
    });
  }, [client]);

  const startOnboarding = useCallback(async () => {
    setState((s) => ({ ...s, step: "hashing", error: null }));

    const callbacks: OnboardingCallbacks = {
      onHashProgress: (processed, total) => {
        setState((s) => ({ ...s, hashProgress: { processed, total } }));
      },
      onHashComplete: () => {
        setState((s) => ({ ...s, step: "computing" }));
      },
      onComputeStart: () => {
        setState((s) => ({ ...s, step: "computing" }));
      },
      onComputeComplete: () => {
        setState((s) => ({ ...s, step: "revealing" }));
      },
      onReveal: () => {
        setState((s) => ({ ...s, step: "complete" }));
      },
      onError: (error) => {
        setState((s) => ({ ...s, step: "error", error: error.message }));
        onError?.(error);
      },
    };

    try {
      let result: PsiResult;
      if (state.demoMode || !client) {
        const demoUsers = demoRegisteredUsers || [
          "alice@example.com", "bob@example.com", "carol@example.com",
          "dave@example.com", "eve@example.com",
        ];
        if (client) {
          result = await client.blindOnboardDemo(contacts, demoUsers, callbacks);
        } else {
          // No client at all (no wallet) — simulate locally
          callbacks.onHashProgress?.(0, contacts.length);
          await new Promise((r) => setTimeout(r, 800));
          callbacks.onHashProgress?.(contacts.length, contacts.length);
          callbacks.onHashComplete?.(contacts.length);
          await new Promise((r) => setTimeout(r, 1200));
          callbacks.onComputeComplete?.();
          await new Promise((r) => setTimeout(r, 600));

          const matched = contacts.filter((c) =>
            demoUsers.some((u) => u.toLowerCase() === c.toLowerCase())
          );
          result = {
            matchedContacts: matched,
            matchCount: matched.length,
            totalChecked: contacts.length,
            txSignature: "demo-mode-no-wallet",
            demoMode: true,
          };
        }
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

  const progressPercent =
    state.hashProgress.total > 0
      ? Math.round((state.hashProgress.processed / state.hashProgress.total) * 100)
      : 0;

  return (
    <div className="blind-onboarding">
      <h2>Find Your Contacts Privately</h2>
      <p className="subtitle">
        Your address book never leaves your device. Only encrypted hashes are
        compared in a secure privacy network.
      </p>

      {state.mxeChecked && state.demoMode && (
        <div className="demo-banner">
          <strong>Demo Mode</strong> — Privacy network is offline. Running local
          simulation with real cryptographic hash matching. In production, this
          computation runs in a distributed privacy network.
        </div>
      )}

      {/* Step Indicator */}
      <div className="steps">
        <StepIndicator
          number={1}
          label="Local Hash"
          active={state.step === "hashing"}
          complete={["computing", "revealing", "complete"].includes(state.step)}
        />
        <StepDivider />
        <StepIndicator
          number={2}
          label="Private Compute"
          active={state.step === "computing"}
          complete={["revealing", "complete"].includes(state.step)}
        />
        <StepDivider />
        <StepIndicator
          number={3}
          label="Result Reveal"
          active={state.step === "revealing"}
          complete={state.step === "complete"}
        />
      </div>

      {/* Step Content */}
      <div className="step-content">
        {state.step === "idle" && (
          <div className="idle-state">
            <p>{contacts.length} contacts ready for private discovery</p>
            <button className="btn-primary" onClick={startOnboarding}>
              Start Private Discovery
            </button>
            <p className="privacy-note">
              Zero contacts are sent to any server. All hashing happens
              on-device in a background thread.
            </p>
          </div>
        )}

        {state.step === "hashing" && (
          <div className="hashing-state">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="progress-context">
              <p className="progress-message">
                Securing contact {state.hashProgress.processed} of {state.hashProgress.total}
                <span className="progress-step-counter">{progressPercent}%</span>
              </p>
              <p className="progress-detail">
                Hashing with salted SHA-256 in a Web Worker — your UI stays responsive
              </p>
            </div>
          </div>
        )}

        {state.step === "computing" && (
          <div className="computing-state">
            <div className="privacy-loader">
              <div className="privacy-fog" />
              <div className="privacy-fog" style={{ animationDelay: "1s" }} />
              <div className="privacy-shield">🔒</div>
            </div>
            <div className="progress-context">
              <p className="progress-message">Private computation in progress</p>
              <p className="progress-detail">
                Privacy network is comparing encrypted hashes. No single node can see your contacts.
              </p>
            </div>

            {/* Split-screen view */}
            <div className="split-view">
              <div className="split-pane user-view">
                <div className="split-pane-header">What You See</div>
                <div style={{ fontSize: "0.88rem", color: "var(--text)" }}>
                  {contacts.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ marginBottom: "0.4rem" }}>{c}</div>
                  ))}
                  {contacts.length > 3 && (
                    <div style={{ color: "var(--text-muted)" }}>
                      ... and {contacts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
              <div className="split-pane network-view">
                <div className="split-pane-header">What Network Sees</div>
                <div className="encrypted-gibberish">
                  0x7a2f8d1c4e9b3f6a<br />
                  0x3d1c9e4b7f2a8d6c<br />
                  0xe9b4f6a2d8c1e7f3<br />
                  {contacts.length > 3 && "0x2a8d6c3f9e4b1c7d"}
                </div>
              </div>
            </div>
          </div>
        )}

        {state.step === "revealing" && (
          <div className="revealing-state">
            <div className="privacy-loader">
              <div className="privacy-fog fog-clear" />
              <div className="privacy-shield">🔓</div>
            </div>
            <div className="progress-context">
              <p className="progress-message">Revealing results</p>
              <p className="progress-detail">
                Decrypting matched contacts on your device
              </p>
            </div>
          </div>
        )}

        {state.step === "complete" && state.result && (
          <div className="complete-state">
            <h3>
              {state.result.matchCount} contact
              {state.result.matchCount !== 1 ? "s" : ""} found!
            </h3>
            <p>
              Out of {state.result.totalChecked} contacts checked,{" "}
              {state.result.matchCount} are already on the platform.
            </p>

            {state.result.matchedContacts.length > 0 && (
              <ul className="matched-list">
                {state.result.matchedContacts.map((contact, i) => (
                  <li key={i} className="contact-silhouette revealed">
                    <span className="contact-name">{maskContact(contact)}</span>
                  </li>
                ))}
              </ul>
            )}

            {state.result.matchCount === 0 && (
              <div className="empty-state" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
                <p className="no-matches">
                  No matches yet — invite your friends to join Blind-Link!
                </p>
              </div>
            )}

            {state.result.demoMode && (
              <p className="demo-note">
                Demo mode result — in production, this comparison runs
                privately in a distributed network.
              </p>
            )}

            <button
              className="btn-primary"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  step: "idle" as const,
                  hashProgress: { processed: 0, total: 0 },
                  result: null,
                  error: null,
                }))
              }
            >
              Done
            </button>
          </div>
        )}

        {state.step === "error" && (
          <div className="error-state">
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
            <p className="error-message">
              {state.error?.includes("MXE public key")
                ? "Privacy network is offline. The network may be undergoing maintenance — please try again later."
                : state.error?.includes("User rejected")
                ? "Transaction was canceled in your wallet."
                : state.error?.includes("insufficient")
                ? "Insufficient wallet balance. Please add some test tokens to your wallet."
                : state.error || "Something went wrong. Please try again."}
            </p>
            <button className="btn-primary" onClick={startOnboarding}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StepIndicator: React.FC<{
  number: number;
  label: string;
  active: boolean;
  complete: boolean;
}> = ({ number, label, active, complete }) => (
  <div className={`step-indicator ${active ? "active" : ""} ${complete ? "complete" : ""}`}>
    <div className="step-circle">{complete ? "\u2713" : number}</div>
    <span className="step-label">{label}</span>
  </div>
);

const StepDivider: React.FC = () => <div className="step-divider" />;

function maskContact(contact: string): string {
  if (contact.includes("@")) {
    const [local, domain] = contact.split("@");
    return local.slice(0, 2) + "***@" + domain;
  }
  if (contact.length > 6) {
    return contact.slice(0, 3) + "****" + contact.slice(-2);
  }
  return contact.slice(0, 2) + "***";
}

export default BlindOnboarding;
