"use client";
import { useUI } from "@/lib/store";

export function EnterFloor7Trigger() {
  const view = useUI((s) => s.view);
  const enterFloor = useUI((s) => s.enterFloor);
  if (view !== "building") return null;
  return (
    <button
      onClick={() => enterFloor(7)}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-[rgba(255,210,138,0.12)] backdrop-blur-md border border-[rgba(255,210,138,0.5)] px-5 py-2.5 rounded-md text-xs text-[#ffd28a] font-mono hover:bg-[rgba(255,210,138,0.2)] hover:text-white transition tracking-widest"
    >
      ENTER FLOOR 7
    </button>
  );
}
