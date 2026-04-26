"use client";
import type { FloorInsights } from "@shared/schema/floor";
import type { Group } from "@shared/schema/kg";
import { useUI } from "@/lib/store";
import { colorForSlug, DEFAULT_GROUP_COLORS } from "@/lib/colors";

interface Props {
  insights: FloorInsights | null;
  curatedGroups: Group[];
}

export function FloorLegend({ insights, curatedGroups }: Props) {
  const view = useUI((s) => s.view);
  const groupFilter = useUI((s) => s.groupFilter);
  const areaFilter = useUI((s) => s.areaFilter);
  const setGroupFilter = useUI((s) => s.setGroupFilter);
  const setAreaFilter = useUI((s) => s.setAreaFilter);

  if (view !== "floor" || !insights) return null;

  // Resolve colors: curated > KG color > deterministic palette pick.
  const colorBySlug = new Map<string, string>();
  insights.groups.forEach((g) => {
    colorBySlug.set(g.slug, g.color ?? colorForSlug(g.slug));
  });
  curatedGroups.forEach((g, i) => {
    colorBySlug.set(g.id, g.color ?? DEFAULT_GROUP_COLORS[i % DEFAULT_GROUP_COLORS.length]!);
  });

  return (
    <div className="pointer-events-auto fixed top-14 left-5 z-30 max-w-[440px]">
      <div className="bg-[var(--ink-glass,rgba(8,12,22,0.7))] backdrop-blur-md border border-[var(--rule)] rounded-md overflow-hidden">
        <div className="px-3 pt-2 pb-1 flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--graphite-2)]">
            Groups · floor 7
          </span>
          {(groupFilter || areaFilter) && (
            <button
              onClick={() => { setGroupFilter(null); setAreaFilter(null); }}
              className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--graphite-2)] hover:text-[var(--bone)] transition"
            >
              clear
            </button>
          )}
        </div>
        <div className="px-2 pb-2 flex flex-wrap gap-1">
          {insights.groups.map((g) => {
            const active = groupFilter === g.slug;
            const color = colorBySlug.get(g.slug) ?? "#7a8aa6";
            return (
              <button
                key={g.slug}
                onClick={() => setGroupFilter(active ? null : g.slug)}
                title={`${g.name} · ${g.memberCount} on floor`}
                className={[
                  "px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-mono smallcaps transition border",
                  active
                    ? "border-[var(--bone)] text-[var(--bone)] bg-[rgba(244,237,224,0.08)]"
                    : "border-[var(--rule)] text-[var(--graphite-2)] hover:text-[var(--bone)] hover:border-[var(--rule-strong)]"
                ].join(" ")}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {g.shortName ?? truncateName(g.name, 22)}
                <span className="tabular text-[var(--graphite,#5d6678)]">{g.memberCount}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-[var(--rule)] px-3 pt-2 pb-1">
          <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--graphite-2)]">
            Research areas
          </span>
        </div>
        <div className="px-2 pb-2 flex flex-wrap gap-1 max-h-[140px] overflow-y-auto">
          {insights.areas.map((a) => {
            const active = areaFilter === a.slug;
            return (
              <button
                key={a.slug}
                onClick={() => setAreaFilter(active ? null : a.slug)}
                title={`${a.name} · ${a.peopleCount} on floor`}
                className={[
                  "px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-mono smallcaps transition border",
                  active
                    ? "border-[var(--bone)] text-[var(--bone)] bg-[rgba(244,237,224,0.08)]"
                    : "border-[var(--rule)] text-[var(--graphite-2)] hover:text-[var(--bone)] hover:border-[var(--rule-strong)]"
                ].join(" ")}
              >
                {truncateName(a.name, 26)}
                <span className="tabular text-[var(--graphite,#5d6678)]">{a.peopleCount}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function truncateName(name: string, max: number) {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}
