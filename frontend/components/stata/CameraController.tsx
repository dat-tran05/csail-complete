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
      ref.current.setLookAt(0, 14, 8, 0, 7.5, 0, true);
      return;
    }
    if (view === "floor" && selectedRoomId) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (!room) return;
      const cx = room.polygon.reduce((a, [x]) => a + x, 0) / room.polygon.length;
      const cy = room.polygon.reduce((a, [, y]) => a + y, 0) / room.polygon.length;
      void cx; void cy;
      ref.current.setLookAt(2, 10, 6, 0, 7.5, 0, true);
    }
  }, [view, selectedRoomId, rooms]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.6} />;
}
