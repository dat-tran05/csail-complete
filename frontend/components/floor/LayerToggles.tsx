"use client";
import { useUI, type FloorLayer } from "@/lib/store";

const LAYERS: { key: FloorLayer; label: string; tip: string }[] = [
  { key: "heatmap", label: "Activity", tip: "Tint rooms by recent paper output" },
  { key: "news",    label: "News",     tip: "Pulse rooms whose occupants appear in recent news" },
  { key: "arcs",    label: "Coauthors", tip: "Arcs between rooms whose occupants coauthor papers" },
];

export function LayerToggles() {
  const view = useUI((s) => s.view);
  const activeLayers = useUI((s) => s.activeLayers);
  const toggleLayer = useUI((s) => s.toggleLayer);
  if (view !== "floor") return null;

  return (
    <div className="pointer-events-auto fixed top-14 right-5 z-40 flex flex-col gap-px items-stretch bg-[var(--ink-glass,rgba(8,12,22,0.7))] backdrop-blur-md border border-[var(--rule)] rounded-md overflow-hidden">
      <div className="px-3 pt-2 pb-1 font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--graphite-2)]">
        Layers
      </div>
      {LAYERS.map((l) => {
        const active = activeLayers.has(l.key);
        return (
          <button
            key={l.key}
            onClick={() => toggleLayer(l.key)}
            title={l.tip}
            className={[
              "px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono smallcaps transition border-l-2",
              active
                ? "bg-[rgba(244,237,224,0.06)] border-[var(--gold,#d4b25f)] text-[var(--bone)]"
                : "border-transparent text-[var(--graphite-2)] hover:text-[var(--bone)] hover:bg-[rgba(244,237,224,0.03)]"
            ].join(" ")}
          >
            <span className={[
              "inline-block w-1.5 h-1.5 rounded-full",
              active ? "bg-[var(--gold,#d4b25f)]" : "bg-[var(--graphite,#5d6678)]"
            ].join(" ")} />
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
