"use client";
import { useUI, type EntityKind } from "@/lib/store";
import type { ToolStepState } from "../../lib/agent-types";

interface Reference { kind: EntityKind; id: string; label: string }

/**
 * Looks at the structured outputs of the agent's tools and surfaces the
 * concrete entities the answer was grounded in. Each one opens its dossier.
 */
export function TurnReferences({ toolSteps }: { toolSteps: ToolStepState[] }) {
  const openDossier = useUI((s) => s.openDossier);
  const refs = extractReferences(toolSteps);
  if (refs.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-[var(--rule)]">
      <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular mb-1.5">
        Referenced · {refs.length}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {refs.slice(0, 16).map((r, i) => (
          <li key={`${r.kind}:${r.id}:${i}`}>
            <button
              onClick={() => openDossier({ kind: r.kind, id: r.id })}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tabular px-2 py-0.5 rounded-full border border-[var(--rule-strong)] text-[var(--bone)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition"
            >
              <span className="text-[var(--graphite-2)] uppercase tracking-widest text-[8px]">{r.kind}</span>
              <span>{r.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function extractReferences(steps: ToolStepState[]): Reference[] {
  const out: Reference[] = [];
  const seen = new Set<string>();
  const push = (r: Reference) => {
    const key = `${r.kind}:${r.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  };

  for (const step of steps) {
    if (step.status !== "ok" || step.result == null) continue;
    walk(step.name, step.result, push);
  }
  return out;
}

function walk(toolName: string, result: unknown, push: (r: Reference) => void) {
  if (Array.isArray(result)) {
    for (const item of result) walk(toolName, item, push);
    return;
  }
  if (result && typeof result === "object") {
    const o = result as Record<string, unknown>;

    // Person — has nodeId or nodeId+name
    if (typeof o.nodeId === "string" && typeof o.name === "string") {
      push({ kind: "person", id: o.nodeId, label: o.name });
    }
    // Group
    if (typeof o.slug === "string" && typeof o.name === "string" && (o as { type?: string }).type !== "Project") {
      push({ kind: "group", id: o.slug, label: o.name });
    }
    // Room
    if (typeof o.id === "string" && o.id.startsWith("32-G") && typeof o.number === "string") {
      push({ kind: "room", id: o.id, label: `Room G${o.number}` });
    }
    // recurse into known children
    for (const [k, v] of Object.entries(o)) {
      if (k === "groups" || k === "rooms" || k === "members" || k === "coauthors" || k === "papers" || k === "news" || k === "people") {
        walk(toolName, v, push);
      }
    }
  }
}
