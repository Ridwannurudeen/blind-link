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
    case "email": normalized = trimmed.toLowerCase(); break;
    case "phone":
      normalized = trimmed.replace(/[^\d+]/g, "");
      if (!normalized.startsWith("+")) normalized = "+1" + normalized;
      break;
    case "handle": normalized = trimmed.toLowerCase(); break;
    default: normalized = trimmed.toLowerCase();
  }
  return { raw: trimmed, normalized, type };
}

const TYPE_STYLES: Record<ContactType, { label: string; cls: string }> = {
  email: { label: "Email", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  phone: { label: "Phone", cls: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  handle: { label: "Handle", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  unknown: { label: "Other", cls: "bg-zinc-700/30 text-zinc-500 border-zinc-600" },
};

export const ContactInput: React.FC<ContactInputProps> = ({
  onSubmit, disabled, maxContacts = 32,
}) => {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedContact[]>([]);

  const parseContacts = useCallback((raw: string) => {
    const lines = raw.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => s.length > 0);
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
  }, []);

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
    (acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; },
    {} as Record<ContactType, number>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Your Contacts</h3>
        <label className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
          <input type="file" accept=".txt,.csv" onChange={handleFileUpload} hidden />
          Upload File
        </label>
      </div>

      <textarea
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2.5 text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-y"
        placeholder={"Paste contacts (one per line, comma, or semicolon separated)\n\nalice@example.com\nbob@example.com\n+1-555-0123\n@twitter_handle"}
        value={text}
        onChange={handleChange}
        rows={6}
        disabled={disabled}
      />

      {/* Type detection badges */}
      {parsed.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(typeCounts) as ContactType[]).map((t) => (
            <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${TYPE_STYLES[t].cls}`}>
              {TYPE_STYLES[t].label}: {typeCounts[t]}
            </span>
          ))}
        </div>
      )}

      {/* Normalized preview */}
      {parsed.length > 0 && parsed.length <= 10 && (
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded p-2.5 space-y-1 max-h-48 overflow-y-auto">
          {parsed.slice(0, maxContacts).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${TYPE_STYLES[c.type].cls}`}>
                {TYPE_STYLES[c.type].label}
              </span>
              <span className="font-mono text-zinc-300">{c.normalized}</span>
              {c.raw !== c.normalized && (
                <span className="text-zinc-600 italic">&larr; {c.raw}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {parsed.length > 0
            ? `${Math.min(parsed.length, maxContacts)} contact${Math.min(parsed.length, maxContacts) !== 1 ? "s" : ""} ready`
            : "No contacts yet"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={disabled || parsed.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
        >
          Start Private Discovery
        </button>
      </div>

      {parsed.length > maxContacts && (
        <p className="text-xs text-red-400">Max {maxContacts} contacts per batch. Only the first {maxContacts} will be processed.</p>
      )}

      {/* JIT Privacy Notice */}
      <div className="flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400 flex-shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        <span className="text-xs text-blue-400/70">Contacts are hashed on-device. Nothing leaves your browser unencrypted.</span>
      </div>
    </div>
  );
};
