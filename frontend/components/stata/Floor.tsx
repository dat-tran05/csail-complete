"use client";
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import type { Room } from "@shared/schema/room";
import type { Group } from "@shared/schema/kg";
import { RoomMesh } from "./RoomMesh";
import { DEFAULT_GROUP_COLORS } from "@/lib/colors";

interface Props {
  rooms: Room[];
  groups: Group[];
  level: number;
}

const FLOOR_HEIGHT = 1.0;
const RENDER_HEIGHT_OFFSET = 0.5;

export function Floor({ rooms, groups, level }: Props) {
  const { worldOffset, scale } = useMemo(() => {
    if (rooms.length === 0) return { worldOffset: [0, 0] as [number, number], scale: 0.012 };
    const xs = rooms.flatMap((r) => r.polygon.map(([x]) => x));
    const ys = rooms.flatMap((r) => r.polygon.map(([, y]) => y));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY);
    const TARGET_WIDTH = 12;
    return { worldOffset: [cx, cy] as [number, number], scale: TARGET_WIDTH / span };
  }, [rooms]);

  const colorByRoom = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g, i) => {
      const c = g.color ?? DEFAULT_GROUP_COLORS[i % DEFAULT_GROUP_COLORS.length]!;
      g.roomIds.forEach((rid) => map.set(rid, c));
    });
    return map;
  }, [groups]);

  return (
    <group position={[0, level * FLOOR_HEIGHT + RENDER_HEIGHT_OFFSET, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#1a2238" roughness={0.95} />
      </mesh>

      {rooms.map((room) => (
        <group key={room.id}>
          <RoomMesh
            room={room}
            color={colorByRoom.get(room.id) ?? "#6688aa"}
            worldOffset={worldOffset}
            scale={scale}
          />
          <Text
            position={[
              (room.polygon.reduce((a, [x]) => a + x, 0) / room.polygon.length - worldOffset[0]) * scale,
              0.4,
              -(room.polygon.reduce((a, [, y]) => a + y, 0) / room.polygon.length - worldOffset[1]) * scale,
            ]}
            fontSize={0.18}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {room.number}
          </Text>
        </group>
      ))}
    </group>
  );
}
