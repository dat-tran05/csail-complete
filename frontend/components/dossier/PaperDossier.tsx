"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { DossierTitle, DossierSection, DossierFootActions, DossierLoading, DossierEmpty } from "./parts";

interface PaperDetail {
  paper: {
    id: string; title: string; abstract?: string; year: number; venue?: string;
    citationCount?: number; openAccessPdfUrl?: string; doi?: string; arxivId?: string;
  };
  authors: { id: string; name: string; isInternal: boolean }[];
  groups: { id: string; name: string; color?: string; shortName?: string }[];
}

export function PaperDossier({ id }: { id: string }) {
  const [data, setData] = useState<PaperDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kg/paper/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [id]);

  if (loading) return <DossierLoading />;
  if (!data) return <DossierEmpty id={id} label="Paper ingest is pending." />;

  return (
    <div className="animate-fadeIn">
      <DossierTitle
        eyebrow={`${data.paper.venue ?? "—"} · ${data.paper.year}`}
        title={data.paper.title}
        subtitle={typeof data.paper.citationCount === "number" ? `${data.paper.citationCount} citations` : undefined}
      />

      {data.paper.abstract && (
        <DossierSection label="Abstract">
          <p className="font-body text-[13px] leading-relaxed text-[var(--bone-soft)] line-clamp-10">
            {data.paper.abstract}
          </p>
        </DossierSection>
      )}

      <DossierSection label={`Authors · ${data.authors.length}`}>
        <ul className="flex flex-wrap gap-1.5">
          {data.authors.map((a, i) => (
            <li key={`${a.id}-${i}`}>
              {a.isInternal ? (
                <button
                  onClick={() => openDossier({ kind: "person", id: a.id })}
                  className="font-body text-[12px] text-[var(--bone)] hover:text-[var(--gold)] transition px-2 py-0.5 rounded border border-[var(--rule-strong)]"
                >
                  {a.name}
                </button>
              ) : (
                <span className="font-body text-[12px] text-[var(--graphite-2)] px-2 py-0.5">
                  {a.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </DossierSection>

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

      {(data.paper.openAccessPdfUrl || data.paper.doi || data.paper.arxivId) && (
        <DossierSection label="Links">
          <ul className="space-y-1.5 font-mono text-[11px] tabular">
            {data.paper.openAccessPdfUrl && (
              <li>
                <a href={data.paper.openAccessPdfUrl} target="_blank" rel="noopener noreferrer"
                   className="text-[var(--gold)] hover:text-[var(--bone)] transition underline underline-offset-2">
                  open access pdf ↗
                </a>
              </li>
            )}
            {data.paper.doi && (
              <li className="text-[var(--graphite-2)]">DOI · {data.paper.doi}</li>
            )}
            {data.paper.arxivId && (
              <li>
                <a href={`https://arxiv.org/abs/${data.paper.arxivId}`} target="_blank" rel="noopener noreferrer"
                   className="text-[var(--gold)] hover:text-[var(--bone)] transition underline underline-offset-2">
                  arXiv:{data.paper.arxivId} ↗
                </a>
              </li>
            )}
          </ul>
        </DossierSection>
      )}

      <DossierFootActions kind="paper" id={id} />
    </div>
  );
}
