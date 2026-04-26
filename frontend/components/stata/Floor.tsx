"use client";
import { useMemo } from "react";
import { Text, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Room } from "@shared/schema/room";
import type { Group } from "@shared/schema/kg";
import { RoomMesh } from "./RoomMesh";
import { DEFAULT_GROUP_COLORS } from "@/lib/colors";

interface Props {
  rooms: Room[];
  groups: Group[];
  level: number;
}

// Stata-shaped Floor 7 outline traced from the MIT facilities plan (Gates 7).
// Authored coords are in a 0–100 normalized space; Floor.tsx auto-scales to fit.
const STATA_OUTLINE: [number, number][] = [
  [10, 14],
  [44, 10],
  [70, 12],
  [82, 22],
  [88, 18],
  [92, 36],
  [86, 44],
  [94, 60],
  [82, 64],
  [86, 80],
  [72, 88],
  [56, 84],
  [46, 96],
  [28, 92],
  [22, 78],
  [10, 80],
  [4, 60],
  [12, 50],
  [6, 36],
  [16, 26],
];

// Decorative interior rooms (not in the data layer — pure visual context for Floor 7).
const CONTEXT_ROOMS: { id: string; polygon: [number, number][] }[] = [
  { id: "ctx-G736", polygon: [[18,22],[26,18],[28,30],[20,32]] },
  { id: "ctx-G738", polygon: [[28,18],[36,16],[38,28],[30,30]] },
  { id: "ctx-G740", polygon: [[38,16],[46,16],[48,28],[40,28]] },
  { id: "ctx-G742", polygon: [[48,16],[56,18],[58,28],[50,28]] },
  { id: "ctx-G744", polygon: [[58,18],[66,20],[66,30],[60,30]] },
  { id: "ctx-G746", polygon: [[66,22],[74,24],[74,30],[68,30]] },
  { id: "ctx-G725", polygon: [[18,64],[30,62],[32,76],[20,78]] },
  { id: "ctx-G728", polygon: [[18,76],[30,76],[30,86],[18,86]] },
  { id: "ctx-G730", polygon: [[10,46],[18,42],[22,52],[14,56]] },
  { id: "ctx-G775", polygon: [[78,64],[88,60],[90,76],[80,80]] },
  { id: "ctx-G785", polygon: [[36,76],[40,72],[44,86],[38,88]] },
  { id: "ctx-G790", polygon: [[60,86],[72,84],[74,92],[62,94]] },
];

function polyToShape(poly: [number, number][], offset: [number, number], scale: number): THREE.Shape {
  const s = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    const wx = (x - offset[0]) * scale;
    const wy = (y - offset[1]) * scale;
    if (i === 0) s.moveTo(wx, wy);
    else s.lineTo(wx, wy);
  });
  s.closePath();
  return s;
}

function polyToPoints3D(poly: [number, number][], offset: [number, number], scale: number, y: number): [number, number, number][] {
  const pts = poly.map(([x, z]) => [(x - offset[0]) * scale, y, -(z - offset[1]) * scale] as [number, number, number]);
  pts.push(pts[0]!);
  return pts;
}

export function Floor({ rooms, groups, level: _level }: Props) {
  const { worldOffset, scale } = useMemo(() => {
    const allPts = [...STATA_OUTLINE];
    if (allPts.length === 0) return { worldOffset: [0, 0] as [number, number], scale: 0.12 };
    const xs = allPts.map(([x]) => x);
    const ys = allPts.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY);
    return { worldOffset: [cx, cy] as [number, number], scale: 14 / span };
  }, []);

  const slabShape = useMemo(() => polyToShape(STATA_OUTLINE, worldOffset, scale), [worldOffset, scale]);
  const slabOutline = useMemo(() => polyToPoints3D(STATA_OUTLINE, worldOffset, scale, 0.16), [worldOffset, scale]);

  const colorByRoom = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g, i) => {
      const c = g.color ?? DEFAULT_GROUP_COLORS[i % DEFAULT_GROUP_COLORS.length]!;
      g.roomIds.forEach((rid) => map.set(rid, c));
    });
    return map;
  }, [groups]);

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#070b14" roughness={1.0} />
      </mesh>

      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh receiveShadow>
          <extrudeGeometry args={[slabShape, { depth: 0.12, bevelEnabled: false }]} />
          <meshStandardMaterial color="#1c2438" roughness={0.9} metalness={0.05} />
        </mesh>
      </group>

      <Line points={slabOutline} color="#7d92b8" lineWidth={1.4} transparent opacity={0.85} />

      {CONTEXT_ROOMS.map((r) => {
        const shape = polyToShape(r.polygon, worldOffset, scale);
        const outline = polyToPoints3D(r.polygon, worldOffset, scale, 0.21);
        return (
          <group key={r.id}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <mesh>
                <extrudeGeometry args={[shape, { depth: 0.06, bevelEnabled: false }]} />
                <meshBasicMaterial color="#2a3552" transparent opacity={0.55} toneMapped={false} />
              </mesh>
            </group>
            <Line points={outline} color="#5a6d8c" lineWidth={1} transparent opacity={0.6} />
          </group>
        );
      })}

      {rooms.map((room) => {
        const cx = room.polygon.reduce((a, [x]) => a + x, 0) / room.polygon.length;
        const cz = room.polygon.reduce((a, [, y]) => a + y, 0) / room.polygon.length;
        const labelX = (cx - worldOffset[0]) * scale;
        const labelZ = -(cz - worldOffset[1]) * scale;
        const outline = polyToPoints3D(room.polygon, worldOffset, scale, 0.32);
        return (
          <group key={room.id}>
            <RoomMesh
              room={room}
              color={colorByRoom.get(room.id) ?? "#6688aa"}
              worldOffset={worldOffset}
              scale={scale}
            />
            <Line points={outline} color={colorByRoom.get(room.id) ?? "#aabacc"} lineWidth={1.5} transparent opacity={0.95} />
            <Text
              position={[labelX, 0.6, labelZ]}
              fontSize={0.6}
              color="#ffffff"
              outlineColor="#000000"
              outlineWidth={0.03}
              anchorX="center"
              anchorY="middle"
              renderOrder={10}
              material-depthTest={false}
              fontWeight={700}
            >
              {room.number}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
