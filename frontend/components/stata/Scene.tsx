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
        <ambientLight intensity={0.35} color="#7090b0" />
        <directionalLight position={[10, 18, 6]} intensity={0.9} color="#fff5dc" castShadow />
        <pointLight position={[-8, 6, -4]} intensity={0.6} color="#a36ee2" />

        <fog attach="fog" args={["#0d121f", 30, 80]} />

        <StataExterior dimmed={view === "floor"} />
        <Floor7Ring />
        {view === "floor" && <Floor rooms={rooms} groups={groups} level={7} />}

        <CameraController rooms={rooms} />

        <Environment preset="night" background={false} />
      </Suspense>
    </Canvas>
  );
}
