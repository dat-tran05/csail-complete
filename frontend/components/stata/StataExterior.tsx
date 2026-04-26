"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface Props { dimmed?: boolean; }

const TARGET_FOOTPRINT = 14;

export function StataExterior({ dimmed = false }: Props) {
  const { scene } = useGLTF("/models/stata.glb");
  const groupRef = useRef<THREE.Group>(null);
  const opacity = dimmed ? 0.3 : 1.0;

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const scale = TARGET_FOOTPRINT / Math.max(size.x, size.z);
    return {
      scale,
      position: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number],
    };
  }, [scene]);

  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, [scene]);

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
    <group ref={groupRef}>
      <group position={fit.position} scale={fit.scale}>
        <primitive object={scene} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0d111e" roughness={1.0} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/models/stata.glb");
