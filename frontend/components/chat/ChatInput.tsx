"use client";
import { useState } from "react";

interface Props { onSubmit: (msg: string) => void; busy: boolean; }

export function ChatInput({ onSubmit, busy }: Props) {
  const [value, setValue] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !value.trim()) return;
    onSubmit(value);
    setValue("");
  };
  return (
    <form onSubmit={submit} className="bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.18)] rounded-md flex items-center px-3 py-2 shadow-xl">
      <span className="text-[#5a78a0] font-mono text-xs mr-2">›</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={busy ? "thinking…" : "Ask CSAIL anything…"}
        disabled={busy}
        className="flex-1 bg-transparent outline-none text-[#d0d8e4] text-[11px] font-mono placeholder-[#7a8aa0] disabled:opacity-50"
      />
    </form>
  );
}
