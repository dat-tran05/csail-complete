"use client";

interface ApiNode { kind: string }
interface ApiGraph { nodes: ApiNode[]; edges: { type: string }[] }

export function AtlasLegend({ graph, loading, warning }: {
  graph: ApiGraph | null;
  loading: boolean;
  warning: string | null;
}) {
  if (!graph) return null;
  const counts: Record<string, number> = {};
  for (const n of graph.nodes) counts[n.kind] = (counts[n.kind] ?? 0) + 1;

  return (
    <div className="bg-[var(--ink-glass)] backdrop-blur-md border border-[var(--rule-strong)] rounded-2xl p-3 max-w-[260px]">
      <div className="font-mono text-[9px] smallcaps tabular text-[var(--graphite-2)] mb-1.5">
        The Atlas · live
      </div>
      <div className="font-display text-[28px] leading-none tabular text-[var(--bone)] mb-1"
           style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
        {graph.nodes.length.toLocaleString()}
        <span className="font-body text-[12px] text-[var(--graphite-2)] ml-2">nodes</span>
      </div>
      <div className="font-mono text-[10px] tabular text-[var(--graphite-2)] mb-3">
        {graph.edges.length.toLocaleString()} edges
        {loading && <span className="ml-2 text-[var(--gold)] animate-pulseSoft">· refreshing</span>}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] tabular">
        {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
          <div key={k} className="flex items-center justify-between text-[var(--bone-soft)]">
            <span className="capitalize">{k}</span>
            <span>{n}</span>
          </div>
        ))}
      </div>

      {warning && (
        <div className="mt-3 pt-2 border-t border-[var(--rule)] font-mono text-[9px] tabular text-[var(--cinnabar)]">
          {warning}
        </div>
      )}
    </div>
  );
}
