"use client";
import { useState, useEffect } from "react";

interface Props {
  thinking: string;
  status: "running" | "done" | "error";
  toolCount: number;
  durationMs?: number;
}

export function ThinkingBlock({ thinking, status, toolCount, durationMs }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (status !== "running") setOpen(false); }, [status]);

  if (!thinking && status === "running") {
    return (
      <div className="font-mono text-[10px] smallcaps text-[var(--graphite-2)] tabular mb-2 animate-pulseSoft">
        · thinking
      </div>
    );
  }
  if (!thinking) return null;

  const seconds = durationMs ? (durationMs / 1000).toFixed(1) : null;
  const label = status === "running"
    ? "thinking…"
    : `thought for ${seconds ?? "—"}s${toolCount ? ` · ${toolCount} tool call${toolCount === 1 ? "" : "s"}` : ""}`;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="font-mono text-[10px] smallcaps text-[var(--graphite-2)] hover:text-[var(--bone-soft)] tabular transition"
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <div className="mt-1.5 pl-3 border-l border-[var(--rule)] font-body text-[11px] italic text-[var(--graphite-2)] whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
          {thinking}
        </div>
      )}
    </div>
  );
}
