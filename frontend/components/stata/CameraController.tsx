"use client";
import { useRef, useEffect } from "react";
import { CameraControls } from "@react-three/drei";
import type { Room } from "@shared/schema/room";
import { useUI } from "@/lib/store";

interface Props { rooms: Room[]; }

export function CameraController({ rooms }: Props) {
  const ref = useRef<CameraControls | null>(null);
  const view = useUI((s) => s.view);
  const selectedRoomId = useUI((s) => s.selectedRoomId);

  useEffect(() => {
    if (!ref.current) return;
    if (view === "exterior") {
      ref.current.setLookAt(12, 8, 18, 0, 4, 0, true);
      return;
    }
    if (view === "floor" && !selectedRoomId) {
      ref.current.setLookAt(0, 18, 0.001, 0, 0, 0, true);
      return;
    }
    if (view === "floor" && selectedRoomId) {
      ref.current.setLookAt(2, 14, 6, 0, 0, 0, true);
    }
  }, [view, selectedRoomId, rooms]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.6} />;
}
