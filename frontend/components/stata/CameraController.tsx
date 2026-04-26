"use client";
import { useRef, useEffect } from "react";
import { CameraControls } from "@react-three/drei";
import { useUI } from "@/lib/store";

export function CameraController() {
  const ref = useRef<CameraControls | null>(null);
  const view = useUI((s) => s.view);

  useEffect(() => {
    if (!ref.current) return;
    if (view === "exterior") {
      ref.current.setLookAt(12, 8, 18, 0, 4, 0, true);
    }
  }, [view]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.6} />;
}
