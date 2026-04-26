"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/lib/store";

export function MetaLabel() {
  const router = useRouter();
  const view = useUI((s) => s.view);
  const exitFloor = useUI((s) => s.exitFloor);
  const selectRoom = useUI((s) => s.selectRoom);
  const selectedRoomId = useUI((s) => s.selectedRoomId);
  const closeDossier = useUI((s) => s.closeDossier);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        router.push("/atlas");
        return;
      }
      if (e.key === "Escape") {
        if (selectedRoomId) selectRoom(null);
        else if (view === "floor") exitFloor();
        else closeDossier();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, selectedRoomId, router, exitFloor, selectRoom, closeDossier]);

  return null;
}
