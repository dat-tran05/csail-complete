"use client";
import type { FloorRoomInsight } from "@shared/schema/floor";
import type { RoomDef } from "./floor-7-rooms";

interface Props {
  room: RoomDef;
  insight: FloorRoomInsight | null;
  groupName?: string | null;
  groupColor?: string | null;
  mouseX: number;
  mouseY: number;
}

export function RoomTooltip({ room, insight, groupName, groupColor, mouseX, mouseY }: Props) {
  const occupants = insight?.occupantCount ?? 0;
  const papers = insight?.recentPaperCount ?? 0;
  const news = insight?.recentNewsCount ?? 0;
  const pi = insight?.piName ?? null;

  // Title: prefer named space > curated label > PI surname > "Room {number}"
  const headline =
    room.namedSpace ?? room.label ?? (pi ? `${pi}'s office` : `Room ${room.number}`);

  // Sub-headline: group affiliation when available
  const subhead = groupName ?? insight?.dominantGroupSlug ?? null;

  // Activity stats line
  const stats: string[] = [];
  if (occupants > 0) stats.push(`${occupants} ${occupants === 1 ? "person" : "people"}`);
  if (papers > 0) stats.push(`${papers} paper${papers === 1 ? "" : "s"} (12mo)`);
  if (news > 0) stats.push(`${news} news mention${news === 1 ? "" : "s"}`);

  // Position offset from cursor; clamp to viewport.
  const tooltipWidth = 240;
  const offsetX = 14;
  const offsetY = 14;
  const x = Math.min(mouseX + offsetX, (typeof window !== "undefined" ? window.innerWidth : 1920) - tooltipWidth - 8);
  const y = Math.max(mouseY + offsetY, 60);

  return (
    <div
      className="fixed z-[31] pointer-events-none rounded-md border bg-[var(--ink-glass,rgba(8,12,22,0.92))] backdrop-blur"
      style={{
        left: x,
        top: y,
        width: tooltipWidth,
        borderColor: groupColor ?? "rgba(244,237,224,0.18)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
      }}
    >
      <div className="px-3 pt-2.5 pb-1.5 border-b border-[rgba(244,237,224,0.08)]">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--graphite-2,#8089a0)]">
            {room.number}
          </span>
          {groupColor && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: groupColor }}
            />
          )}
        </div>
        <div className="mt-0.5 text-[14px] leading-tight text-[var(--bone,#f4ede0)]"
             style={{ fontFamily: "var(--font-fraunces), serif" }}>
          {headline}
        </div>
        {subhead && (
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--graphite-2,#8089a0)]"
               style={{ fontFamily: "var(--font-plex-mono), monospace" }}>
            {subhead}
          </div>
        )}
      </div>
      {stats.length > 0 && (
        <div className="px-3 py-1.5 text-[11px] text-[var(--graphite-2,#a8b2c5)] font-mono leading-relaxed">
          {stats.join(" · ")}
        </div>
      )}
      {occupants === 0 && (
        <div className="px-3 py-1.5 text-[11px] text-[var(--graphite,#5d6678)] italic">
          unoccupied
        </div>
      )}
    </div>
  );
}
