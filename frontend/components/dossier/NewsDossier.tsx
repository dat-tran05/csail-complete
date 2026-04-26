"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { DossierTitle, DossierSection, DossierFootActions, DossierLoading, DossierEmpty } from "./parts";

interface NewsDetail {
  news: { id: string; title: string; publishedAt: string; url: string; excerpt?: string; imageUrl?: string };
  people: { id: string; name: string }[];
  groups: { id: string; name: string; color?: string; shortName?: string }[];
}

export function NewsDossier({ id }: { id: string }) {
  const [data, setData] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kg/news/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [id]);

  if (loading) return <DossierLoading />;
  if (!data) return <DossierEmpty id={id} label="News ingest is pending." />;

  return (
    <div className="animate-fadeIn">
      {data.news.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={data.news.imageUrl} alt="" className="w-full h-44 object-cover" />
      )}
      <DossierTitle
        eyebrow={`Press · ${data.news.publishedAt.slice(0, 10)}`}
        title={data.news.title}
      />

      {data.news.excerpt && (
        <DossierSection label="Excerpt">
          <p className="font-body text-[13px] leading-relaxed text-[var(--bone-soft)]">{data.news.excerpt}</p>
        </DossierSection>
      )}

      {data.people.length > 0 && (
        <DossierSection label="Mentions">
          <ul className="flex flex-wrap gap-1.5">
            {data.people.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openDossier({ kind: "person", id: p.id })}
                  className="font-body text-[12px] text-[var(--bone)] hover:text-[var(--gold)] transition px-2 py-0.5 rounded border border-[var(--rule-strong)]"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
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

      <DossierSection label="Source">
        <a
          href={data.news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-[var(--gold)] hover:text-[var(--bone)] transition tabular underline underline-offset-2"
        >
          {data.news.url.replace(/^https?:\/\//, "")} ↗
        </a>
      </DossierSection>

      <DossierFootActions kind="news" id={id} />
    </div>
  );
}
