"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Subtle, distant point cloud — gives the deep sky some depth without
 * pulling focus from the building. Drifts very slowly.
 */
export function Starfield({ count = 480 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tints: [number, number, number][] = [
      [0.96, 0.94, 0.84],   // bone
      [1.0,  0.86, 0.66],   // gold
      [0.78, 0.82, 0.92],   // cool
    ];
    for (let i = 0; i < count; i++) {
      const r = 60 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.85;
      positions[i * 3 + 0] = r * Math.cos(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) + 8;
      positions[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
      const [tr, tg, tb] = tints[Math.floor(Math.random() * tints.length)]!;
      colors[i * 3 + 0] = tr;
      colors[i * 3 + 1] = tg;
      colors[i * 3 + 2] = tb;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.005;
  });

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        size={0.18}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}
