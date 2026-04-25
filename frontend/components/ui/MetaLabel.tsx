"use client";
import { useEffect } from "react";
import { useUI } from "@/lib/store";

export function MetaLabel() {
  const view = useUI((s) => s.view);
  const activeFloor = useUI((s) => s.activeFloor);
  const setGraphOpen = useUI((s) => s.setGraphOpen);
  const exitFloor = useUI((s) => s.exitFloor);
  const selectRoom = useUI((s) => s.selectRoom);
  const selectedRoomId = useUI((s) => s.selectedRoomId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setGraphOpen(true);
        return;
      }
      if (e.key === "Escape") {
        if (selectedRoomId) selectRoom(null);
        else if (view === "floor") exitFloor();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, selectedRoomId, setGraphOpen, exitFloor, selectRoom]);

  return (
    <div className="absolute top-4 left-4 z-30 text-[10px] tracking-widest font-mono text-[rgba(180,195,220,0.6)]">
      {view === "exterior"
        ? <><span className="text-[#e8d8b8] tracking-[0.2em]">STATA</span> · CSAIL · 32</>
        : <><span className="text-[#e8d8b8] tracking-[0.2em]">FLOOR {activeFloor}</span> · 32-G{activeFloor} · GATES</>
      }
    </div>
  );
}
