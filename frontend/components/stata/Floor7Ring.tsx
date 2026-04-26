"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUI } from "@/lib/store";

/**
 * "Section cut" — a thin horizontal disk + bracket lines that visually mark
 * the height of Floor 7. Replaces the prior pulsing ring with a calmer
 * architectural section indicator.
 */
export function Floor7Ring() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const view = useUI((s) => s.view);

  useFrame((state) => {
    if (!groupRef.current) return;
    const visible = view === "building";
    const t = state.clock.elapsedTime;
    groupRef.current.visible = visible;
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = visible ? 0.36 + Math.sin(t * 0.9) * 0.10 : 0;
    }
  });

  return (
    <group ref={groupRef} position={[-0.3, 4.6, 0]}>
      {/* Slice plane (very thin disk) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.05, 3.15, 96]} />
        <meshBasicMaterial color="#ffd28a" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Halo glow */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.18, 3.7, 96]} />
        <meshBasicMaterial color="#ffd28a" transparent opacity={0.15} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Drop lines (4 cardinal section markers) */}
      {[
        [3.4, 0, 0], [-3.4, 0, 0], [0, 0, 3.4], [0, 0, -3.4],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshBasicMaterial color="#ffd28a" transparent opacity={0.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
