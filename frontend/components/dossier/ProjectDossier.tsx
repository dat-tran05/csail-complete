"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { DossierTitle, DossierSection, DossierFootActions, DossierLoading, DossierEmpty } from "./parts";

interface ProjectDetail {
  project: { id: string; title: string; url?: string; teaser?: string };
  groups: { id: string; name: string; shortName?: string; color?: string }[];
  contributors: { id: string; name: string }[];
}

export function ProjectDossier({ id }: { id: string }) {
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kg/project/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [id]);

  if (loading) return <DossierLoading />;
  if (!data) return <DossierEmpty id={id} label="Project not found in the index." />;

  const accent = data.groups[0]?.color;

  return (
    <div className="animate-fadeIn">
      <DossierTitle eyebrow="Project" title={data.project.title} subtitle={data.project.id} accent={accent} />

      {data.project.teaser && (
        <DossierSection label="Teaser">
          <p className="font-body text-[13px] leading-relaxed text-[var(--bone-soft)]">{data.project.teaser}</p>
        </DossierSection>
      )}

      {data.groups.length > 0 && (
        <DossierSection label="Groups">
          <ul className="flex flex-wrap gap-1.5">
            {data.groups.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => openDossier({ kind: "group", id: g.id })}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-body text-[var(--bone)] hover:bg-[var(--rule)] transition"
                  style={{ border: `1px solid ${g.color ?? "var(--rule-strong)"}55` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                  {g.shortName ?? g.name}
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      <DossierSection label={`Contributors · ${data.contributors.length}`}>
        <ul className="grid grid-cols-2 gap-1">
          {data.contributors.slice(0, 24).map((c) => (
            <li key={c.id}>
              <button
                onClick={() => openDossier({ kind: "person", id: c.id })}
                className="text-left font-body text-[12px] text-[var(--bone)] hover:text-[var(--gold)] transition truncate w-full"
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </DossierSection>

      {data.project.url && (
        <DossierSection label="Site">
          <a
            href={data.project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-[var(--gold)] hover:text-[var(--bone)] transition tabular underline underline-offset-2"
          >
            {data.project.url.replace(/^https?:\/\//, "")} ↗
          </a>
        </DossierSection>
      )}

      <DossierFootActions kind="project" id={id} />
    </div>
  );
}
