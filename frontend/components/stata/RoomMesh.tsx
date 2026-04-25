"use client";
import { useMemo } from "react";
import * as THREE from "three";
import type { Room } from "@shared/schema/room";
import { useUI } from "@/lib/store";

interface Props {
  room: Room;
  color: string;
  worldOffset: [number, number];
  scale: number;
}

export function RoomMesh({ room, color, worldOffset, scale }: Props) {
  const selectedId = useUI((s) => s.selectedRoomId);
  const hoveredId = useUI((s) => s.hoveredRoomId);
  const selectRoom = useUI((s) => s.selectRoom);
  const hoverRoom = useUI((s) => s.hoverRoom);

  const isSelected = selectedId === room.id;
  const isHovered = hoveredId === room.id;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    room.polygon.forEach(([x, y], i) => {
      const wx = (x - worldOffset[0]) * scale;
      const wy = (y - worldOffset[1]) * scale;
      if (i === 0) s.moveTo(wx, wy);
      else s.lineTo(wx, wy);
    });
    s.closePath();
    return s;
  }, [room.polygon, worldOffset, scale]);

  const baseColor = new THREE.Color(color);
  const intensity = isSelected ? 1.0 : isHovered ? 0.5 : 0.18;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); hoverRoom(room.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); hoverRoom(null); document.body.style.cursor = "default"; }}
        onClick={(e) => { e.stopPropagation(); selectRoom(room.id); }}
      >
        <extrudeGeometry args={[shape, { depth: 0.25, bevelEnabled: false }]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={intensity}
          transparent
          opacity={0.85}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}
