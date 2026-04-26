"use client";
import { useEffect, useMemo, useState } from "react";
import { useUI } from "@/lib/store";

interface ApiNode { nid: number; kind: string; id: string; label: string }
interface ApiGraph { nodes: ApiNode[] }

export function AtlasSearch({ graph }: { graph: ApiGraph | null }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const openDossier = useUI((s) => s.openDossier);

  const matches = useMemo(() => {
    if (!q.trim() || !graph) return [];
    const lc = q.toLowerCase();
    return graph.nodes
      .filter((n) => n.label.toLowerCase().includes(lc))
      .slice(0, 12);
  }, [q, graph]);

  useEffect(() => { setOpen(matches.length > 0); }, [matches.length]);

  return (
    <div className="relative w-[420px]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="search the graph — name, group, project…"
        onFocus={() => setOpen(matches.length > 0)}
        className="w-full px-4 py-2 rounded-full bg-[var(--ink-glass)] backdrop-blur-md border border-[var(--rule-strong)] outline-none font-body text-[13px] text-[var(--bone)] placeholder-[var(--graphite-2)] focus:border-[var(--gold)] transition"
      />
      {open && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-[var(--ink-glass-1)] backdrop-blur-md border border-[var(--rule-strong)] rounded-2xl py-1 max-h-72 overflow-y-auto">
          {matches.map((n) => (
            <li key={n.nid}>
              <button
                onClick={() => {
                  openDossier({ kind: n.kind as "person", id: n.id });
                  setQ("");
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-1.5 hover:bg-[var(--rule)] transition flex items-baseline justify-between gap-3"
              >
                <span className="font-body text-[13px] text-[var(--bone)] truncate">{n.label}</span>
                <span className="font-mono text-[9px] smallcaps tabular text-[var(--graphite-2)] shrink-0">
                  {n.kind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
