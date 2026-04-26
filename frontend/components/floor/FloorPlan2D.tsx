"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import type { Group } from "@shared/schema/kg";
import type { FloorInsights, FloorRoomInsight } from "@shared/schema/floor";
import { useUI } from "@/lib/store";
import { DEFAULT_GROUP_COLORS, colorForSlug } from "@/lib/colors";
import {
  FLOOR_7_ROOMS,
  STATA_OUTLINE,
  TYPE_FILL,
  pointsAttr,
  centroid,
  type RoomDef,
} from "./floor-7-rooms";
import { RoomTooltip } from "./RoomTooltip";

interface Props {
  groups: Group[];
  insights?: FloorInsights | null;
}

export function FloorPlan2D({ groups, insights }: Props) {
  const view = useUI((s) => s.view);
  const selectedId = useUI((s) => s.selectedRoomId);
  const hoveredId = useUI((s) => s.hoveredRoomId);
  const selectRoom = useUI((s) => s.selectRoom);
  const hoverRoom = useUI((s) => s.hoverRoom);

  // Build per-room insight lookup.
  const insightByRoom = useMemo(() => {
    const m = new Map<string, FloorRoomInsight>();
    insights?.rooms.forEach((r) => m.set(r.id, r));
    return m;
  }, [insights]);

  // Resolve colors. Curated groups (from groups.json) win; otherwise the
  // KG dominant group's color (curated colors merged from data/groups.json
  // server-side may already be present); otherwise a deterministic palette
  // pick from the slug.
  const colorByRoom = useMemo(() => {
    const m = new Map<string, string>();
    // Layer 1: KG dominant group per room.
    insights?.rooms.forEach((r) => {
      if (!r.dominantGroupSlug) return;
      const color = r.dominantGroupColor ?? colorForSlug(r.dominantGroupSlug);
      m.set(r.id, color);
    });
    // Layer 2: curated overrides from data/groups.json (highest priority).
    groups.forEach((g, i) => {
      const c = g.color ?? DEFAULT_GROUP_COLORS[i % DEFAULT_GROUP_COLORS.length]!;
      g.roomIds.forEach((rid) => m.set(rid, c));
    });
    return m;
  }, [groups, insights]);

  // Pan / zoom state
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [zoom, setZoom] = useState(1);
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Group lookup for tooltip (curated colors+names take precedence over KG-derived)
  const groupBySlug = useMemo(() => {
    const m = new Map<string, { name: string; color: string | null }>();
    insights?.groups.forEach((g) => m.set(g.slug, { name: g.name, color: g.color }));
    groups.forEach((g, i) => {
      if (g.color) m.set(g.id, { name: g.name, color: g.color });
      else m.set(g.id, { name: g.name, color: DEFAULT_GROUP_COLORS[i % DEFAULT_GROUP_COLORS.length]! });
    });
    return m;
  }, [groups, insights]);

  const hoveredRoom = hoveredId ? FLOOR_7_ROOMS.find((r) => r.id === hoveredId) ?? null : null;
  const hoveredInsight = hoveredId ? insightByRoom.get(hoveredId) ?? null : null;
  const hoveredGroupSlug = hoveredInsight?.dominantGroupSlug ?? null;
  const hoveredGroup = hoveredGroupSlug ? groupBySlug.get(hoveredGroupSlug) ?? null : null;

  useEffect(() => {
    if (view !== "floor") {
      setTx(0); setTy(0); setZoom(1);
    }
  }, [view]);

  if (view !== "floor") return null;

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom((z) => Math.max(0.6, Math.min(3.5, z * factor)));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragging.current = { x: e.clientX - tx, y: e.clientY - ty };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!dragging.current) return;
    setTx(e.clientX - dragging.current.x);
    setTy(e.clientY - dragging.current.y);
  };
  const onPointerLeave = () => { setMousePos(null); };
  const onPointerUp = () => { dragging.current = null; };

  return (
    <div
      className="absolute inset-0 z-20 select-none"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #0d1322 0%, #060812 65%, #03050b 100%)",
      }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <FloorElevator />

      {hoveredRoom && mousePos && (
        <RoomTooltip
          room={hoveredRoom}
          insight={hoveredInsight}
          groupName={hoveredGroup?.name}
          groupColor={hoveredGroup?.color ?? colorByRoom.get(hoveredRoom.id) ?? null}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
        />
      )}

      <div className="absolute bottom-6 left-6 text-[9px] text-[var(--graphite-2)] font-mono smallcaps leading-relaxed tabular">
        drag · pan<br/>scroll · zoom<br/>click · select room<br/>esc · close
      </div>

      <svg
        ref={svgRef}
        viewBox="0 4 100 92"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
          transformOrigin: "center center",
          cursor: dragging.current ? "grabbing" : "grab",
        }}
      >
        <defs>
          <pattern id="gridFine" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#ffffff" strokeWidth="0.025" opacity="0.05" />
          </pattern>
          <pattern id="grid5m" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#ffffff" strokeWidth="0.05" opacity="0.10" />
          </pattern>
          <pattern id="poche" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1.4" stroke="rgba(255,255,255,0.25)" strokeWidth="0.06" />
          </pattern>
          <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.7" />
            <feOffset dx="0" dy="0.6" result="off" />
            <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#gridFine)" />
        <rect x="0" y="0" width="100" height="100" fill="url(#grid5m)" />

        <polygon
          points={pointsAttr(STATA_OUTLINE)}
          fill="#0a0e1a"
          opacity="0.5"
          transform="translate(0.3, 0.4)"
        />
        <polygon
          points={pointsAttr(STATA_OUTLINE)}
          fill="#10162a"
          stroke="#5d7196"
          strokeWidth="0.45"
          strokeLinejoin="round"
        />
        <polygon
          points={pointsAttr(STATA_OUTLINE)}
          fill="none"
          stroke="rgba(244,237,224,0.12)"
          strokeWidth="0.08"
          strokeLinejoin="round"
          transform="scale(0.99) translate(0.5, 0.5)"
        />

        {FLOOR_7_ROOMS.map((room) => (
          <RoomCell
            key={room.id}
            room={room}
            insight={insightByRoom.get(room.id) ?? null}
            color={colorByRoom.get(room.id)}
            isSelected={selectedId === room.id}
            isHovered={hoveredId === room.id}
            onHover={hoverRoom}
            onSelect={selectRoom}
          />
        ))}

        <NorthArrow />
        <ScaleBar />

        <g transform="translate(78, 96)">
          <text fontSize="0.85" fill="rgba(244,237,224,0.45)"
                style={{ fontFamily: "var(--font-plex-mono), monospace", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            32-G7 · plan · 1:200 (approx)
          </text>
        </g>
      </svg>
    </div>
  );
}

interface RoomCellProps {
  room: RoomDef;
  insight: FloorRoomInsight | null;
  color: string | undefined;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

function RoomCell({ room, insight, color, isSelected, isHovered, onHover, onSelect }: RoomCellProps) {
  const occupants = insight?.occupantCount ?? 0;
  const interactive = !!color || occupants > 0;
  const baseFill = color ?? TYPE_FILL[room.type ?? "office"];
  const fillOpacity = color ? (isSelected ? 0.92 : isHovered ? 0.74 : 0.55) : (isSelected ? 0.85 : isHovered ? 0.55 : 1);
  const stroke = isSelected ? "#ffffff" : color ?? "#3d4a66";
  const strokeWidth = isSelected ? 0.4 : isHovered ? 0.28 : 0.16;
  const [cx, cy] = centroid(room.polygon);

  // Label resolution hierarchy:
  // 1. namedSpace → big serif uppercase (Gates Tower Atrium)
  // 2. curated room.label (HCI Lab common, PL office, etc.)
  // 3. PI surname from insights (DELIMITROU, JACKSON)
  // 4. else → none
  const isNamedSpace = !!room.namedSpace;
  const subLabel = room.namedSpace ?? room.label ?? insight?.piName ?? null;

  return (
    <g
      style={{ cursor: interactive ? "pointer" : "default" }}
      onMouseEnter={interactive ? () => onHover(room.id) : undefined}
      onMouseLeave={interactive ? () => onHover(null) : undefined}
      onClick={interactive ? (e) => { e.stopPropagation(); onSelect(room.id); } : undefined}
    >
      <polygon
        points={pointsAttr(room.polygon)}
        fill={baseFill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {interactive && (isHovered || isSelected) && (
        <polygon
          points={pointsAttr(room.polygon)}
          fill="url(#poche)"
          pointerEvents="none"
          opacity={isSelected ? 0.55 : 0.3}
        />
      )}
      {interactive && !isHovered && !isSelected && (
        <polygon
          points={pointsAttr(room.polygon)}
          fill="url(#poche)"
          pointerEvents="none"
          opacity={0.15}
        />
      )}
      {!isNamedSpace && (
        <text
          x={cx}
          y={cy + (subLabel ? -0.6 : 0.4)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={interactive ? 1.7 : 1.15}
          fontWeight={interactive ? 600 : 400}
          fill={interactive ? "#ffffff" : "rgba(244,237,224,0.55)"}
          style={{
            pointerEvents: "none",
            fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {room.number}
        </text>
      )}
      {isNamedSpace ? (
        <text
          x={cx}
          y={cy + 0.4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="1.6"
          fill="rgba(244,237,224,0.7)"
          style={{
            pointerEvents: "none",
            fontFamily: "var(--font-fraunces), serif",
            fontStyle: "italic",
            letterSpacing: "0.02em",
          }}
        >
          {room.namedSpace}
        </text>
      ) : subLabel ? (
        <text
          x={cx}
          y={cy + 1.7}
          textAnchor="middle"
          fontSize="0.78"
          fill="rgba(255,255,255,0.7)"
          style={{
            pointerEvents: "none",
            fontFamily: "var(--font-plex-mono), monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {subLabel}
        </text>
      ) : null}
    </g>
  );
}

function NorthArrow() {
  return (
    <g transform="translate(92, 12)">
      <circle r="2.8" fill="rgba(12,14,19,0.85)" stroke="rgba(244,237,224,0.32)" strokeWidth="0.12" />
      <path d="M 0 -1.7 L 0.95 1.5 L 0 0.65 L -0.95 1.5 Z" fill="#f4ede0" />
      <text x="0" y="-3.6" textAnchor="middle" fontSize="1.0" fill="rgba(244,237,224,0.65)"
            style={{ fontFamily: "var(--font-fraunces), serif", fontStyle: "italic" }}>
        N
      </text>
    </g>
  );
}

function ScaleBar() {
  return (
    <g transform="translate(7, 92)">
      <rect x="0" y="-0.4" width="2.5" height="0.8" fill="rgba(244,237,224,0.7)" stroke="rgba(244,237,224,0.7)" strokeWidth="0.05" />
      <rect x="2.5" y="-0.4" width="2.5" height="0.8" fill="none" stroke="rgba(244,237,224,0.7)" strokeWidth="0.05" />
      <rect x="5" y="-0.4" width="2.5" height="0.8" fill="rgba(244,237,224,0.7)" />
      <rect x="7.5" y="-0.4" width="2.5" height="0.8" fill="none" stroke="rgba(244,237,224,0.7)" strokeWidth="0.05" />
      <text x="0"  y="2.0" textAnchor="middle" fontSize="0.75" fill="rgba(244,237,224,0.65)"
            style={{ fontFamily: "var(--font-plex-mono), monospace", fontVariantNumeric: "tabular-nums" }}>0</text>
      <text x="5"  y="2.0" textAnchor="middle" fontSize="0.75" fill="rgba(244,237,224,0.65)"
            style={{ fontFamily: "var(--font-plex-mono), monospace", fontVariantNumeric: "tabular-nums" }}>6m</text>
      <text x="10" y="2.0" textAnchor="middle" fontSize="0.75" fill="rgba(244,237,224,0.65)"
            style={{ fontFamily: "var(--font-plex-mono), monospace", fontVariantNumeric: "tabular-nums" }}>12m</text>
      <text x="13" y="0.4" fontSize="0.7" fill="rgba(244,237,224,0.4)"
            style={{ fontFamily: "var(--font-plex-mono), monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        scale
      </text>
    </g>
  );
}

function FloorElevator() {
  const view = useUI((s) => s.view);
  const activeFloor = useUI((s) => s.activeFloor);
  const enterFloor = useUI((s) => s.enterFloor);
  const exitFloor = useUI((s) => s.exitFloor);
  if (view !== "floor") return null;

  const floors = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-stretch animate-fadeUp">
      <button
        onClick={exitFloor}
        title="back to building"
        className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] hover:text-[var(--bone)] transition tabular pb-2 border-b border-[var(--rule)] mb-2"
      >
        ↑ building
      </button>
      <ul className="flex flex-col gap-px">
        {floors.map((f) => {
          const active = f === activeFloor;
          const enabled = f === 7;
          return (
            <li key={f}>
              <button
                disabled={!enabled}
                onClick={() => enterFloor(f)}
                title={enabled ? `Floor ${f}` : "data not yet ingested"}
                className={[
                  "w-12 py-1 flex items-baseline justify-center gap-1 transition border-r-2",
                  active
                    ? "border-[var(--gold)] text-[var(--bone)]"
                    : enabled
                      ? "border-transparent text-[var(--graphite-2)] hover:text-[var(--bone)] hover:border-[var(--rule-strong)]"
                      : "border-transparent text-[var(--graphite)] cursor-not-allowed",
                ].join(" ")}
              >
                <span className="font-display tabular text-[18px] leading-none"
                      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
                  {f}
                </span>
                {active && (
                  <span className="font-mono text-[8px] smallcaps tabular text-[var(--gold)]">●</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
