"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface ProjectRow {
  id: string; title: string; url: string | null; teaser: string | null;
  groups: { id: string; name: string; color?: string; shortName?: string }[];
  contributorCount: number;
}

export function ProjectsTab() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    fetch("/api/kg/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const filtered = q.trim()
    ? projects.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()))
    : projects;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--rule)]">
        <h2 className="font-display text-[28px] text-[var(--fg)]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          Projects
          <span className="ml-3 font-mono text-[14px] text-[var(--fg-mute)] tabular">{filtered.length}</span>
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search projects…"
          className="px-3 py-1 bg-transparent border-b border-[var(--rule-strong)] focus:border-[var(--accent)] outline-none font-body text-[13px] text-[var(--fg)] placeholder-[var(--fg-mute)] w-60"
        />
      </div>
      {loading ? (
        <div className="font-mono text-[12px] tabular text-[var(--fg-mute)] py-12 text-center">loading projects…</div>
      ) : (
        <ul className="columns-1 md:columns-2 gap-6 [column-fill:_balance]">
          {filtered.map((p) => (
            <li key={p.id} className="break-inside-avoid mb-3">
              <button
                onClick={() => openDossier({ kind: "project", id: p.id })}
                className="w-full text-left p-3 border border-[var(--rule)] hover:border-[var(--accent)] transition rounded-sm bg-[var(--bg-1)]/60"
              >
                <h3 className="font-display text-[16px] leading-tight text-[var(--fg)] mb-1.5"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
                  {p.title}
                </h3>
                {p.teaser && (
                  <p className="font-body text-[12px] text-[var(--fg-soft)] line-clamp-2 leading-snug mb-2">
                    {p.teaser}
                  </p>
                )}
                <div className="flex items-center justify-between font-mono text-[10px] tabular text-[var(--fg-mute)]">
                  <div className="flex flex-wrap gap-1">
                    {p.groups.slice(0, 2).map((g) => (
                      <span key={g.id} className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full" style={{ background: g.color }} />
                        {g.shortName ?? g.name}
                      </span>
                    ))}
                  </div>
                  <span>{p.contributorCount} contributors</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
