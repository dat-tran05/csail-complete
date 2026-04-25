"use client";
import { useEffect } from "react";
import { useUI } from "@/lib/store";

interface Props { floor: number; roomId: string; }

export function DeepLinkInitializer({ floor, roomId }: Props) {
  const enterFloor = useUI((s) => s.enterFloor);
  const selectRoom = useUI((s) => s.selectRoom);
  useEffect(() => {
    enterFloor(floor);
    setTimeout(() => selectRoom(roomId), 300);
  }, [floor, roomId, enterFloor, selectRoom]);
  return null;
}
