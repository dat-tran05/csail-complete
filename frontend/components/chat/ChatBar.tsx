"use client";
import { useState } from "react";

export function ChatBar() {
  const [value, setValue] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: value }) });
    const data = await res.json();
    setReply(data.reply);
    setValue("");
  };

  return (
    <div className="absolute bottom-4 left-4 right-44 z-30">
      {reply && (
        <div className="mb-2 bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.18)] rounded-md px-3 py-2 text-[10px] text-[#a8b8d0]">
          {reply}
        </div>
      )}
      <form onSubmit={submit} className="bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.18)] rounded-md flex items-center px-3 py-2 shadow-xl">
        <span className="text-[#5a78a0] font-mono text-xs mr-2">›</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask CSAIL anything…"
          className="flex-1 bg-transparent outline-none text-[#d0d8e4] text-[11px] font-mono placeholder-[#7a8aa0]"
        />
      </form>
    </div>
  );
}
