"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface GroupRow {
  id: string; slug: string; name: string; shortName: string | null;
  kind: string; color: string | null; teaser: string | null;
  memberCount: number; projectCount: number; roomCount: number;
  piNames: string[];
}

export function GroupsTab() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "research-group" | "community-of-research">("all");
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    fetch("/api/kg/groups")
      .then((r) => r.json())
      .then((d) => { setGroups(d.groups ?? []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const filtered = filter === "all" ? groups : groups.filter((g) => g.kind === filter);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--rule)]">
        <h2 className="font-display text-[28px] text-[var(--fg)]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          Groups
          <span className="ml-3 font-mono text-[14px] text-[var(--fg-mute)] tabular">{filtered.length}</span>
        </h2>
        <div className="flex gap-1">
          {[
            { k: "all", l: "All" },
            { k: "research-group", l: "Research" },
            { k: "community-of-research", l: "Community" },
          ].map((o) => (
            <button
              key={o.k}
              onClick={() => setFilter(o.k as "all" | "research-group" | "community-of-research")}
              className={[
                "font-mono text-[10px] smallcaps tabular px-2.5 py-1 rounded",
                filter === o.k ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--fg-soft)] hover:bg-[var(--paper-warp)]"
              ].join(" ")}
            >{o.l}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="font-mono text-[12px] tabular text-[var(--fg-mute)] py-12 text-center">loading groups…</div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => openDossier({ kind: "group", id: g.id })}
                className="w-full text-left p-4 border border-[var(--rule)] hover:border-[var(--accent)] transition rounded-sm bg-[var(--bg-1)]/60 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] smallcaps tabular text-[var(--fg-mute)]">
                    {g.kind === "community-of-research" ? "community" : "research group"}
                  </span>
                  {g.color && (
                    <span className="w-3 h-3 rounded-full" style={{ background: g.color, boxShadow: `0 0 4px ${g.color}66` }} />
                  )}
                </div>
                <h3
                  className="font-display text-[20px] leading-[1.05] text-[var(--fg)] mb-2"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
                >
                  {g.name}
                </h3>
                {g.teaser && (
                  <p className="font-body text-[12px] text-[var(--fg-soft)] line-clamp-2 mb-3 leading-snug">
                    {g.teaser}
                  </p>
                )}
                {g.piNames.length > 0 && (
                  <div className="font-mono text-[10px] tabular text-[var(--fg-mute)] mb-3 truncate">
                    {g.piNames.slice(0, 3).join(" · ")}
                  </div>
                )}
                <div className="flex items-baseline gap-3 font-mono text-[10px] tabular text-[var(--fg-mute)] border-t border-[var(--rule)] pt-2">
                  <Stat n={g.memberCount} label="m" />
                  <Stat n={g.projectCount} label="p" />
                  <Stat n={g.roomCount} label="r" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-display text-[14px] text-[var(--fg)] tabular">{n}</span>
      <span className="smallcaps text-[8px]">{label}</span>
    </span>
  );
}
