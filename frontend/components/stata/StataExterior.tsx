"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props { dimmed?: boolean; }

export function StataExterior({ dimmed = false }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const opacity = dimmed ? 0.3 : 1.0;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material && "opacity" in obj.material) {
        const m = obj.material as THREE.MeshStandardMaterial;
        m.transparent = true;
        m.opacity = THREE.MathUtils.damp(m.opacity, opacity, 4, delta);
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* brick base */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 1, 8]} />
        <meshStandardMaterial color="#4a2415" roughness={0.95} />
      </mesh>

      {/* Gates tower — yellow, leans left */}
      <group position={[-3.2, 0, 0]} rotation={[0, 0, 0.08]}>
        <mesh position={[0, 5, 0]} castShadow>
          <boxGeometry args={[2.6, 9, 2.4]} />
          <meshStandardMaterial color="#c9a444" emissive="#a07820" emissiveIntensity={0.15} roughness={0.4} metalness={0.25} />
        </mesh>
        {[2, 3.5, 5, 6.2, 7.5].map((y, i) => (
          <mesh key={i} position={[1.31, y, (i % 2 ? 0.4 : -0.4)]} >
            <planeGeometry args={[0.4, 0.3]} />
            <meshBasicMaterial color="#ffd28a" toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 10, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 1.4, 16]} />
          <meshStandardMaterial color="#bcbfc7" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Dreyfoos tower — silver, leans right */}
      <group position={[2.0, 0, -0.3]} rotation={[0, 0.1, -0.07]}>
        <mesh position={[0, 4.5, 0]} castShadow>
          <boxGeometry args={[2.8, 8, 2.6]} />
          <meshStandardMaterial color="#9aa0b0" emissive="#3a3e48" emissiveIntensity={0.1} roughness={0.35} metalness={0.55} />
        </mesh>
        {[2.2, 3.6, 5, 6.4].map((y, i) => (
          <mesh key={i} position={[1.41, y, (i % 2 ? 0.4 : -0.4)]} >
            <planeGeometry args={[0.4, 0.3]} />
            <meshBasicMaterial color="#ffd28a" toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* amphitheater pavilion */}
      <mesh position={[5, 1.4, 0.5]} rotation={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[3, 1.8, 3.5]} />
        <meshStandardMaterial color="#8a6440" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Cambridge skyline silhouette far away */}
      <group position={[0, 0, -25]}>
        {Array.from({ length: 14 }).map((_, i) => {
          const x = (i - 7) * 3.5;
          const h = 1.5 + (Math.sin(i * 1.7) + 1) * 1.5;
          return (
            <mesh key={i} position={[x, h / 2, 0]}>
              <boxGeometry args={[2.2, h, 0.5]} />
              <meshBasicMaterial color="#0a0e1a" />
            </mesh>
          );
        })}
      </group>

      {/* ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0d111e" roughness={1.0} />
      </mesh>
    </group>
  );
}
