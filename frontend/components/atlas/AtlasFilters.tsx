"use client";
import { useState } from "react";

type Kind = "person" | "group" | "project" | "paper" | "news" | "area" | "room";
const KINDS: { k: Kind; label: string; color: string }[] = [
  { k: "person",  label: "People",   color: "#f4ede0" },
  { k: "group",   label: "Groups",   color: "#ffd28a" },
  { k: "project", label: "Projects", color: "#7fb1d4" },
  { k: "paper",   label: "Papers",   color: "#9762cf" },
  { k: "news",    label: "News",     color: "#e26b4a" },
  { k: "area",    label: "Areas",    color: "#5fa86a" },
  { k: "room",    label: "Rooms",    color: "#7a8aa6" },
];

const ALL_EDGE_TYPES = [
  "MEMBER_OF", "PI_OF", "BELONGS_TO", "LOCATED_IN", "WORKS_ON",
  "AUTHORED", "COAUTHORED_WITH", "WORKS_IN_AREA", "HAS_IMPACT_ON", "MENTIONED_IN",
];

export interface AtlasFilters {
  kinds: Record<Kind, boolean>;
  edgeTypes: Set<string>;
  floor7Only: boolean;
}

export function AtlasFilters({ value, onChange }: { value: AtlasFilters; onChange: (v: AtlasFilters) => void }) {
  const [edgesOpen, setEdgesOpen] = useState(false);
  const setKind = (k: Kind, on: boolean) =>
    onChange({ ...value, kinds: { ...value.kinds, [k]: on } });
  const toggleEdge = (t: string) => {
    const next = new Set(value.edgeTypes);
    next.has(t) ? next.delete(t) : next.add(t);
    onChange({ ...value, edgeTypes: next });
  };

  return (
    <div className="bg-[var(--ink-glass)] backdrop-blur-md border border-[var(--rule-strong)] rounded-2xl p-3 w-[260px]">
      <div className="font-mono text-[9px] smallcaps tabular text-[var(--graphite-2)] mb-2">
        Entity types
      </div>
      <ul className="grid grid-cols-2 gap-1 mb-3">
        {KINDS.map((k) => {
          const on = value.kinds[k.k];
          return (
            <li key={k.k}>
              <button
                onClick={() => setKind(k.k, !on)}
                className={[
                  "w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] font-mono tabular transition",
                  on ? "bg-[var(--rule)] text-[var(--bone)]" : "text-[var(--graphite-2)] hover:text-[var(--bone)]",
                ].join(" ")}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: on ? k.color : "transparent", border: `1px solid ${k.color}66` }}
                />
                {k.label}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => setEdgesOpen((o) => !o)}
        className="w-full flex items-center justify-between font-mono text-[9px] smallcaps tabular text-[var(--graphite-2)] hover:text-[var(--bone)] transition mb-2"
      >
        <span>Edge types · {value.edgeTypes.size}</span>
        <span>{edgesOpen ? "▾" : "▸"}</span>
      </button>

      {edgesOpen && (
        <ul className="grid grid-cols-1 gap-0.5 mb-3 max-h-60 overflow-y-auto">
          {ALL_EDGE_TYPES.map((t) => {
            const on = value.edgeTypes.has(t);
            return (
              <li key={t}>
                <button
                  onClick={() => toggleEdge(t)}
                  className={[
                    "w-full text-left px-2 py-0.5 font-mono text-[10px] tabular transition rounded",
                    on ? "text-[var(--bone)] bg-[var(--rule)]" : "text-[var(--graphite-2)] hover:text-[var(--bone-soft)]",
                  ].join(" ")}
                >
                  {on ? "●" : "○"} {t.toLowerCase().replaceAll("_", " ")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => onChange({ ...value, floor7Only: !value.floor7Only })}
        className={[
          "w-full px-2 py-1.5 rounded font-mono text-[10px] smallcaps tabular transition",
          value.floor7Only
            ? "bg-[var(--gold)] text-[var(--ink)]"
            : "border border-[var(--rule-strong)] text-[var(--graphite-2)] hover:text-[var(--bone)]"
        ].join(" ")}
      >
        {value.floor7Only ? "● focused on Floor 7" : "○ focus on Floor 7"}
      </button>
    </div>
  );
}
