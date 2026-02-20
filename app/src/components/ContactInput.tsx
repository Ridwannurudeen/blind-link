import React, { useState, useCallback } from "react";
import { Upload, Shield } from "lucide-react";

interface ContactInputProps {
  onSubmit: (contacts: string[]) => void;
  disabled?: boolean;
  maxContacts?: number;
}

type ContactType = "email" | "phone" | "handle" | "unknown";
interface ParsedContact { raw: string; normalized: string; type: ContactType; }

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
    case "phone": normalized = trimmed.replace(/[^\d+]/g, ""); if (!normalized.startsWith("+")) normalized = "+1" + normalized; break;
    case "handle": normalized = trimmed.toLowerCase(); break;
    default: normalized = trimmed.toLowerCase();
  }
  return { raw: trimmed, normalized, type };
}

const TYPE_STYLES: Record<ContactType, { label: string; cls: string }> = {
  email: { label: "Email", cls: "bg-blue-500/8 text-blue-400 border-blue-500/15" },
  phone: { label: "Phone", cls: "bg-arcium/8 text-arcium border-arcium/15" },
  handle: { label: "Handle", cls: "bg-amber-500/8 text-amber-400 border-amber-500/15" },
  unknown: { label: "Other", cls: "bg-zinc-800/50 text-zinc-500 border-zinc-700" },
};

export const ContactInput: React.FC<ContactInputProps> = ({ onSubmit, disabled, maxContacts = 32 }) => {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedContact[]>([]);

  const parseContacts = useCallback((raw: string) => {
    const lines = raw.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    const seen = new Set<string>();
    const contacts: ParsedContact[] = [];
    for (const line of lines) {
      const c = normalizeContact(line);
      if (!seen.has(c.normalized)) { seen.add(c.normalized); contacts.push(c); }
    }
    setParsed(contacts);
    return contacts;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.trim()) parseContacts(val); else setParsed([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    parseContacts(content);
  };

  const handleSubmit = () => {
    if (parsed.length > 0) onSubmit(parsed.slice(0, maxContacts).map((c) => c.normalized));
  };

  const typeCounts = parsed.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {} as Record<ContactType, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-zinc-200">Your Contacts</h3>
        <label className="cursor-pointer flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md border border-border hover:border-zinc-600 transition-colors">
          <Upload size={12} />
          <input type="file" accept=".txt,.csv" onChange={handleFileUpload} hidden />
          Upload
        </label>
      </div>

      <textarea
        className="w-full bg-[#0d0d10] border border-border rounded-lg px-3.5 py-2.5 text-[13px] text-zinc-100 font-mono placeholder-zinc-700 focus:outline-none focus:border-arcium/50 focus:ring-1 focus:ring-arcium/20 transition-all resize-y"
        placeholder={"Paste contacts (one per line, comma, or semicolon separated)\n\nalice@example.com\nbob@example.com\n+1-555-0123"}
        value={text}
        onChange={handleChange}
        rows={5}
        disabled={disabled}
      />

      {parsed.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(typeCounts) as ContactType[]).map((t) => (
            <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${TYPE_STYLES[t].cls}`}>
              {TYPE_STYLES[t].label}: {typeCounts[t]}
            </span>
          ))}
        </div>
      )}

      {parsed.length > 0 && parsed.length <= 10 && (
        <div className="bg-[#0d0d10] border border-border-subtle rounded-lg p-2.5 space-y-1 max-h-44 overflow-y-auto">
          {parsed.slice(0, maxContacts).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${TYPE_STYLES[c.type].cls}`}>
                {TYPE_STYLES[c.type].label}
              </span>
              <span className="font-mono text-zinc-300">{c.normalized}</span>
              {c.raw !== c.normalized && <span className="text-zinc-700 italic">&larr; {c.raw}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-600">
          {parsed.length > 0 ? `${Math.min(parsed.length, maxContacts)} contact${Math.min(parsed.length, maxContacts) !== 1 ? "s" : ""} ready` : "No contacts yet"}
        </span>
        <button onClick={handleSubmit} disabled={disabled || parsed.length === 0}
          className="px-4 py-2 text-[13px] font-medium text-white bg-arcium hover:bg-arcium/90 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors">
          Start Discovery
        </button>
      </div>

      {parsed.length > maxContacts && (
        <p className="text-[11px] text-red-400">Max {maxContacts} per batch. First {maxContacts} will be processed.</p>
      )}

      <div className="flex items-center gap-1.5">
        <Shield size={11} className="text-arcium/50 flex-shrink-0" />
        <span className="text-[11px] text-zinc-600">Contacts hashed on-device. Nothing leaves your browser unencrypted.</span>
      </div>
    </div>
  );
};
