// ============================================================================
// Blind-Link: 3-Step Blind Onboarding UI Component
// ============================================================================
// React component implementing the visual flow:
//   Step 1 — Local Hash:     Animated progress bar, contact count
//   Step 2 — Arcium Compute: MXE status indicator, on-chain tx link
//   Step 3 — Result Reveal:  Matched contacts list with invite actions
// ============================================================================

import React, { useState, useCallback } from "react";
import { BlindLinkClient, PsiResult, OnboardingCallbacks } from "../services/blind-link-client";

// ── Types ───────────────────────────────────────────────────────────────

type OnboardingStep = "idle" | "hashing" | "computing" | "revealing" | "complete" | "error";

interface BlindOnboardingProps {
  client: BlindLinkClient;
  contacts: string[];
  onComplete?: (result: PsiResult) => void;
  onError?: (error: Error) => void;
}

interface StepState {
  step: OnboardingStep;
  hashProgress: { processed: number; total: number };
  result: PsiResult | null;
  error: string | null;
}

// ── Component ───────────────────────────────────────────────────────────

export const BlindOnboarding: React.FC<BlindOnboardingProps> = ({
  client,
  contacts,
  onComplete,
  onError,
}) => {
  const [state, setState] = useState<StepState>({
    step: "idle",
    hashProgress: { processed: 0, total: 0 },
    result: null,
    error: null,
  });

  const startOnboarding = useCallback(async () => {
    setState((s) => ({ ...s, step: "hashing", error: null }));

    const callbacks: OnboardingCallbacks = {
      onHashProgress: (processed, total) => {
        setState((s) => ({
          ...s,
          hashProgress: { processed, total },
        }));
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
      const result = await client.blindOnboard(contacts, callbacks);
      setState((s) => ({ ...s, step: "complete", result }));
      onComplete?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((s) => ({ ...s, step: "error", error: error.message }));
      onError?.(error);
    }
  }, [client, contacts, onComplete, onError]);

  const progressPercent =
    state.hashProgress.total > 0
      ? Math.round(
          (state.hashProgress.processed / state.hashProgress.total) * 100
        )
      : 0;

  return (
    <div className="blind-onboarding">
      <h2>Find Your Contacts Privately</h2>
      <p className="subtitle">
        Your address book never leaves your device. Only encrypted hashes are
        compared inside Arcium's secure computation network.
      </p>

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
          label="Arcium Compute"
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
            <p>
              Hashing contacts locally... {state.hashProgress.processed}/
              {state.hashProgress.total} ({progressPercent}%)
            </p>
            <p className="detail">
              Running salted SHA-256 in a Web Worker — your UI stays responsive
            </p>
          </div>
        )}

        {state.step === "computing" && (
          <div className="computing-state">
            <div className="spinner" />
            <p>Encrypted computation in progress...</p>
            <p className="detail">
              Arcium MXE nodes are performing Private Set Intersection using
              Multi-Party Computation. No single node can see your contacts.
            </p>
            <p className="security-badge">
              Cerberus Protocol — Dishonest Majority Security
            </p>
          </div>
        )}

        {state.step === "revealing" && (
          <div className="revealing-state">
            <div className="spinner" />
            <p>Decrypting results...</p>
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
                  <li key={i}>
                    <span className="contact-name">{maskContact(contact)}</span>
                    <button className="btn-secondary">Connect</button>
                  </li>
                ))}
              </ul>
            )}

            {state.result.matchCount === 0 && (
              <p className="no-matches">
                No matches yet — invite friends to join!
              </p>
            )}

            <button
              className="btn-primary"
              onClick={() =>
                setState({
                  step: "idle",
                  hashProgress: { processed: 0, total: 0 },
                  result: null,
                  error: null,
                })
              }
            >
              Done
            </button>
          </div>
        )}

        {state.step === "error" && (
          <div className="error-state">
            <p className="error-message">
              {state.error?.includes("MXE public key")
                ? "The Arcium MXE cluster is currently unavailable. The devnet network may be undergoing maintenance — please try again later."
                : state.error?.includes("User rejected")
                ? "Transaction was rejected in your wallet."
                : state.error?.includes("insufficient")
                ? "Insufficient SOL balance. Please airdrop devnet SOL to your wallet."
                : state.error || "An unexpected error occurred."}
            </p>
            <button className="btn-primary" onClick={startOnboarding}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-Components ──────────────────────────────────────────────────────

const StepIndicator: React.FC<{
  number: number;
  label: string;
  active: boolean;
  complete: boolean;
}> = ({ number, label, active, complete }) => (
  <div
    className={`step-indicator ${active ? "active" : ""} ${
      complete ? "complete" : ""
    }`}
  >
    <div className="step-circle">
      {complete ? "\u2713" : number}
    </div>
    <span className="step-label">{label}</span>
  </div>
);

const StepDivider: React.FC = () => <div className="step-divider" />;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Partially mask a contact for display (privacy even in the UI). */
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
