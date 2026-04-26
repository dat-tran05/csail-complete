"use client";
import { useState } from "react";

interface Props {
  onSubmit: (msg: string) => void;
  busy: boolean;
  showCollapse?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ChatInput({ onSubmit, busy, showCollapse, collapsed, onToggle }: Props) {
  const [value, setValue] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !value.trim()) return;
    onSubmit(value);
    setValue("");
  };
  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--rule-strong)] backdrop-blur-xl"
      style={{
        background: "linear-gradient(135deg, rgba(244,237,224,0.04) 0%, rgba(20,23,31,0.84) 100%)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(244,237,224,0.06)",
      }}
    >
      <span className="font-mono text-[12px] text-[var(--gold)] tabular shrink-0">›</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={busy ? "thinking…" : "Ask CSAIL — try ‘who studies vision on Floor 7?’"}
        disabled={busy}
        className="flex-1 bg-transparent outline-none font-body text-[14px] text-[var(--bone)] placeholder-[var(--graphite-2)] disabled:opacity-50 min-w-0"
        autoFocus
      />
      {busy && (
        <span className="font-mono text-[10px] smallcaps text-[var(--gold)] tabular animate-pulseSoft">
          ● live
        </span>
      )}
      {showCollapse && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "show conversation" : "hide conversation"}
          className="font-mono text-[10px] smallcaps text-[var(--graphite-2)] hover:text-[var(--bone)] transition shrink-0 tabular"
        >
          {collapsed ? "↑" : "↓"}
        </button>
      )}
    </form>
  );
}
