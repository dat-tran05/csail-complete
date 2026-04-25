"use client";
import { useState } from "react";
import type { ToolStepState } from "../../lib/agent-types";

const TOOL_LABELS: Record<string, string> = {
  find_people_on_floor: "people on floor",
  get_floor_summary: "floor summary",
  get_person_profile: "person profile",
  search_people: "search people",
  find_coauthors: "coauthors",
  recent_news_for_person: "recent news",
};

export function ToolStep({ step }: { step: ToolStepState }) {
  const [open, setOpen] = useState(false);
  const dot = step.status === "running" ? "◯" : step.status === "ok" ? "●" : "✕";
  const dotColor = step.status === "running" ? "text-[#7a8aa0]" : step.status === "ok" ? "text-[#6abf6e]" : "text-[#e26b4a]";
  const inputPreview = step.input.length > 80 ? step.input.slice(0, 80) + "…" : step.input;
  const label = TOOL_LABELS[step.name] ?? step.name;
  const ms = step.durationMs ? `${step.durationMs}ms` : null;

  return (
    <div className="border-l border-[rgba(140,160,200,0.18)] pl-2 my-1">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-[10px] font-mono hover:text-[#d0d8e4] transition-colors w-full text-left">
        <span className={dotColor}>{dot}</span>
        <span className="text-[#a8b8d0]">{label}</span>
        <span className="text-[#5a78a0] truncate">{inputPreview}</span>
        {ms && <span className="text-[#5a78a0] ml-auto">{ms}</span>}
      </button>
      {open && step.result !== undefined && (
        <pre className="mt-1 text-[9px] text-[#7a8aa0] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-[rgba(0,0,0,0.3)] p-2 rounded">
          {JSON.stringify(step.result, null, 2)}
        </pre>
      )}
    </div>
  );
}
