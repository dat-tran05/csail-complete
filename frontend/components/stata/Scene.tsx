"use client";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { PCFShadowMap } from "three";
import { StataExterior } from "./StataExterior";
import { CameraController } from "./CameraController";
import { Floor7Ring } from "./Floor7Ring";
import { Starfield } from "./Starfield";
import { useUI } from "@/lib/store";

export function Scene() {
  const view = useUI((s) => s.view);

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      camera={{ position: [12, 8, 18], fov: 45 }}
      gl={{ antialias: true }}
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg,#050609 0%,#0a1226 35%,#142146 65%,#0a0e1c 100%)",
        opacity: view === "floor" ? 0 : 1,
        transition: "opacity 220ms ease",
        pointerEvents: view === "floor" ? "none" : "auto",
      }}
    >
      <Suspense fallback={null}>
        <hemisphereLight args={["#b8c8e8", "#3a2818", 0.7]} />
        <ambientLight intensity={0.55} color="#a8b8d0" />
        <directionalLight position={[10, 18, 6]} intensity={1.6} color="#fff5dc" castShadow />
        <directionalLight position={[-12, 14, -8]} intensity={0.5} color="#9ab0d8" />
        <pointLight position={[-8, 6, -4]} intensity={0.4} color="#a36ee2" />

        <fog attach="fog" args={["#0a0e1c", 50, 130]} />

        <Starfield />
        <StataExterior />
        <Floor7Ring />

        <CameraController />

        <Environment preset="city" background={false} />
      </Suspense>
    </Canvas>
  );
}
