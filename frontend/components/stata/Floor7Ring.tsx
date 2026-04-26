"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUI } from "@/lib/store";

export function Floor7Ring() {
  const ref = useRef<THREE.Mesh>(null);
  const view = useUI((s) => s.view);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = view === "exterior" ? 0.4 + Math.sin(t * 1.5) * 0.25 : 0;
  });

  return (
    <mesh ref={ref} position={[-0.3, 4.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.0, 3.3, 64]} />
      <meshBasicMaterial color="#ffd28a" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}
