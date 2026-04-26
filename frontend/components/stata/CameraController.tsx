"use client";
import { useRef, useEffect } from "react";
import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useUI } from "@/lib/store";

/**
 * Building view auto-orbits slowly when idle. User interaction interrupts
 * the orbit; a 4s grace timer resumes it.
 */
export function CameraController() {
  const ref = useRef<CameraControls | null>(null);
  const view = useUI((s) => s.view);
  const lastInteract = useRef<number>(0);

  useEffect(() => {
    if (!ref.current) return;
    if (view === "building") {
      ref.current.setLookAt(12, 8, 18, 0, 4, 0, true);
    }
  }, [view]);

  // Track manual control to pause orbit
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onStart = () => { lastInteract.current = performance.now(); };
    c.addEventListener("control", onStart);
    return () => c.removeEventListener("control", onStart);
  }, []);

  useFrame((_, delta) => {
    if (view !== "building") return;
    const c = ref.current;
    if (!c) return;
    const idleMs = performance.now() - lastInteract.current;
    if (idleMs < 4000) return;
    // Slow rotate around Y at ~0.05 rad/s
    c.rotate(delta * 0.05, 0, true);
  });

  return <CameraControls ref={ref} makeDefault smoothTime={0.6} />;
}
