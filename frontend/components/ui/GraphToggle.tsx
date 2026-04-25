"use client";
import { useUI } from "@/lib/store";

export function GraphToggle() {
  const setGraphOpen = useUI((s) => s.setGraphOpen);
  return (
    <button
      onClick={() => setGraphOpen(true)}
      className="absolute bottom-4 right-4 z-30 bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.25)] px-3 py-2 rounded-md text-[11px] text-[#a8b8d0] font-mono hover:text-white transition"
    >
      ⌘G  full graph
    </button>
  );
}
