"use client";
import { useState } from "react";
import type { ToolStepState } from "../../lib/agent-types";

const TOOL_LABELS: Record<string, string> = {
  find_people_on_floor: "people on floor",
  get_floor_summary:    "floor summary",
  get_person_profile:   "person profile",
  search_people:        "search people",
  find_coauthors:       "coauthors",
  recent_news_for_person: "recent news",
};

export function ToolStep({ step }: { step: ToolStepState }) {
  const [open, setOpen] = useState(false);
  const dot = step.status === "running" ? "◐" : step.status === "ok" ? "●" : "✕";
  const tone =
    step.status === "running" ? "text-[var(--graphite-2)]" :
    step.status === "ok"      ? "text-[var(--group-2)]" :
                                "text-[var(--cinnabar)]";
  const label = TOOL_LABELS[step.name] ?? step.name;
  const ms = step.durationMs ? `${step.durationMs}ms` : null;

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tabular px-2 py-1 rounded-full border border-[var(--rule-strong)] hover:bg-[var(--rule)] transition"
      >
        <span className={tone}>{dot}</span>
        <span className="text-[var(--bone)]">{label}</span>
        {ms && <span className="text-[var(--graphite-2)]">· {ms}</span>}
      </button>
      {open && step.result !== undefined && (
        <pre className="mt-1 font-mono text-[10px] tabular text-[var(--graphite-2)] whitespace-pre-wrap max-h-44 overflow-y-auto bg-[rgba(0,0,0,0.35)] p-2 rounded">
          {JSON.stringify(step.result, null, 2)}
        </pre>
      )}
    </div>
  );
}
