"use client";
import { useUI } from "@/lib/store";

export function GraphPlaceholderModal() {
  const open = useUI((s) => s.graphOpen);
  const setOpen = useUI((s) => s.setGraphOpen);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-[rgba(10,12,22,0.96)] border border-[rgba(140,160,200,0.22)] rounded-lg p-8 max-w-md text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-[#ffd28a] tracking-widest text-[10px] mb-3">FULL GRAPH VIEW</div>
        <div className="text-white text-lg font-semibold mb-2">Coming next round</div>
        <div className="text-[#a8b8d0] text-sm mb-6">
          The abstract UMAP graph view of all CSAIL nodes will live here. State slot is wired —
          implementation lands when scrapers cover all groups + embeddings exist.
        </div>
        <button onClick={() => setOpen(false)} className="text-[#7a8aa0] text-xs hover:text-white transition">close</button>
      </div>
    </div>
  );
}
