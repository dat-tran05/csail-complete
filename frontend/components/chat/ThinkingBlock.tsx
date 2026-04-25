"use client";
import { useState, useEffect } from "react";

interface Props {
  thinking: string;
  status: "running" | "done" | "error";
  toolCount: number;
  durationMs?: number;
}

export function ThinkingBlock({ thinking, status, toolCount, durationMs }: Props) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (status !== "running") setOpen(false);
  }, [status]);

  if (!thinking && status === "running") {
    return <div className="text-[10px] text-[#7a8aa0] italic px-2 py-1 font-mono">thinking…</div>;
  }
  if (!thinking) return null;

  const seconds = durationMs ? (durationMs / 1000).toFixed(1) : null;
  const label = status === "running"
    ? `thinking…`
    : `Thought${seconds ? ` for ${seconds}s` : ""}${toolCount ? ` · ${toolCount} tool call${toolCount === 1 ? "" : "s"}` : ""}`;

  return (
    <div className="border-l border-[rgba(140,160,200,0.18)] pl-2 my-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-[#7a8aa0] font-mono hover:text-[#a8b8d0] transition-colors"
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <div className="mt-1 text-[10px] text-[#7a8aa0] font-mono italic whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
          {thinking}
        </div>
      )}
    </div>
  );
}
