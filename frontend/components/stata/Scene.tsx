"use client";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { PCFShadowMap } from "three";
import { StataExterior } from "./StataExterior";
import { Floor } from "./Floor";
import { CameraController } from "./CameraController";
import { Floor7Ring } from "./Floor7Ring";
import { useUI } from "@/lib/store";
import type { Room } from "@shared/schema/room";
import type { Group } from "@shared/schema/kg";

interface SceneProps {
  rooms: Room[];
  groups: Group[];
}

export function Scene({ rooms, groups }: SceneProps) {
  const view = useUI((s) => s.view);

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      camera={{ position: [12, 8, 18], fov: 45 }}
      gl={{ antialias: true }}
      style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#060812 0%,#101a30 35%,#1a2548 70%,#0d121f 100%)" }}
    >
      <Suspense fallback={null}>
        <hemisphereLight args={["#b8c8e8", "#3a2818", 0.7]} />
        <ambientLight intensity={0.55} color="#a8b8d0" />
        <directionalLight position={[10, 18, 6]} intensity={1.6} color="#fff5dc" castShadow />
        <directionalLight position={[-12, 14, -8]} intensity={0.5} color="#9ab0d8" />
        <pointLight position={[-8, 6, -4]} intensity={0.4} color="#a36ee2" />

        <fog attach="fog" args={["#0d121f", 45, 120]} />

        {view === "exterior" && (
          <>
            <StataExterior />
            <Floor7Ring />
          </>
        )}
        {view === "floor" && <Floor rooms={rooms} groups={groups} level={7} />}

        <CameraController rooms={rooms} />

        <Environment preset="city" background={false} />
      </Suspense>
    </Canvas>
  );
}
