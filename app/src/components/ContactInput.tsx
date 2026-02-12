import React, { useState, useCallback } from "react";

interface ContactInputProps {
  onSubmit: (contacts: string[]) => void;
  disabled?: boolean;
}

export const ContactInput: React.FC<ContactInputProps> = ({
  onSubmit,
  disabled,
}) => {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);

  const parseContacts = useCallback((raw: string) => {
    const lines = raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Deduplicate
    const unique = [...new Set(lines)];
    setParsed(unique);
    return unique;
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
    if (parsed.length > 0) onSubmit(parsed);
  };

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
        placeholder={"Paste contacts here (one per line, or comma/semicolon separated)\n\nalice@example.com\nbob@example.com\n+1-555-0123"}
        value={text}
        onChange={handleChange}
        rows={8}
        disabled={disabled}
      />

      <div className="input-footer">
        <span className="contact-count">
          {parsed.length > 0 ? `${parsed.length} contact${parsed.length !== 1 ? "s" : ""} detected` : "No contacts yet"}
        </span>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={disabled || parsed.length === 0}
        >
          Start Private Discovery
        </button>
      </div>

      {parsed.length > 16 && (
        <p className="input-warning">
          Max 16 contacts per batch. Only the first 16 will be processed.
        </p>
      )}
    </div>
  );
};
