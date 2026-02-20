import React, { useState, useCallback } from "react";

interface ContactInputProps {
  onSubmit: (contacts: string[]) => void;
  disabled?: boolean;
  maxContacts?: number;
}

type ContactType = "email" | "phone" | "handle" | "unknown";

interface ParsedContact {
  raw: string;
  normalized: string;
  type: ContactType;
}

function detectType(s: string): ContactType {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "email";
  if (/^\+?[\d\s\-().]{7,}$/.test(s)) return "phone";
  if (/^@\w+$/.test(s)) return "handle";
  return "unknown";
}

function normalizeContact(raw: string): ParsedContact {
  const trimmed = raw.trim();
  const type = detectType(trimmed);

  let normalized = trimmed;
  switch (type) {
    case "email":
      normalized = trimmed.toLowerCase();
      break;
    case "phone":
      // Strip all non-digit except leading +
      normalized = trimmed.replace(/[^\d+]/g, "");
      // Default country code if no +
      if (!normalized.startsWith("+")) normalized = "+1" + normalized;
      break;
    case "handle":
      normalized = trimmed.toLowerCase();
      break;
    default:
      normalized = trimmed.toLowerCase();
  }

  return { raw: trimmed, normalized, type };
}

const TYPE_BADGE: Record<ContactType, { label: string; color: string }> = {
  email: { label: "Email", color: "var(--accent)" },
  phone: { label: "Phone", color: "var(--primary-light)" },
  handle: { label: "Handle", color: "#fdcb6e" },
  unknown: { label: "Other", color: "var(--text-muted)" },
};

export const ContactInput: React.FC<ContactInputProps> = ({
  onSubmit,
  disabled,
  maxContacts = 32,
}) => {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedContact[]>([]);

  const parseContacts = useCallback(
    (raw: string) => {
      const lines = raw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Deduplicate by normalized value
      const seen = new Set<string>();
      const contacts: ParsedContact[] = [];
      for (const line of lines) {
        const c = normalizeContact(line);
        if (!seen.has(c.normalized)) {
          seen.add(c.normalized);
          contacts.push(c);
        }
      }
      setParsed(contacts);
      return contacts;
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.trim()) parseContacts(val);
    else setParsed([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    parseContacts(content);
  };

  const handleSubmit = () => {
    if (parsed.length > 0) {
      onSubmit(parsed.slice(0, maxContacts).map((c) => c.normalized));
    }
  };

  const typeCounts = parsed.reduce(
    (acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    },
    {} as Record<ContactType, number>
  );

  return (
    <div className="contact-input">
      <div className="input-header">
        <h3>Your Contacts</h3>
        <label className="file-upload">
          <input
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            hidden
          />
          <span className="btn-secondary btn-sm">Upload File</span>
        </label>
      </div>

      <textarea
        className="contact-textarea"
        placeholder={
          "Paste contacts (one per line, comma, or semicolon separated)\n\nalice@example.com\nbob@example.com\n+1-555-0123\n@twitter_handle"
        }
        value={text}
        onChange={handleChange}
        rows={8}
        disabled={disabled}
      />

      {/* Type Detection Summary */}
      {parsed.length > 0 && (
        <div className="contact-types">
          {(Object.keys(typeCounts) as ContactType[]).map((t) => (
            <span
              key={t}
              className="contact-type-badge"
              style={{ borderColor: TYPE_BADGE[t].color, color: TYPE_BADGE[t].color }}
            >
              {TYPE_BADGE[t].label}: {typeCounts[t]}
            </span>
          ))}
        </div>
      )}

      {/* Normalized Preview */}
      {parsed.length > 0 && parsed.length <= 10 && (
        <div className="contact-preview">
          {parsed.slice(0, maxContacts).map((c, i) => (
            <div key={i} className="contact-preview-row">
              <span
                className="contact-preview-badge"
                style={{ background: TYPE_BADGE[c.type].color + "22", color: TYPE_BADGE[c.type].color }}
              >
                {TYPE_BADGE[c.type].label}
              </span>
              <span className="contact-preview-value">{c.normalized}</span>
              {c.raw !== c.normalized && (
                <span className="contact-preview-original">← {c.raw}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="input-footer">
        <span className="contact-count">
          {parsed.length > 0
            ? `${Math.min(parsed.length, maxContacts)} contact${
                Math.min(parsed.length, maxContacts) !== 1 ? "s" : ""
              } ready`
            : "No contacts yet"}
        </span>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={disabled || parsed.length === 0}
        >
          Start Private Discovery
        </button>
      </div>

      {parsed.length > maxContacts && (
        <p className="input-warning">
          Max {maxContacts} contacts per batch. Only the first {maxContacts} will be processed.
        </p>
      )}
    </div>
  );
};
