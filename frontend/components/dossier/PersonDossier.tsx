"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { DossierTitle, DossierSection, DossierFootActions, DossierLoading, DossierEmpty } from "./parts";

interface PersonDetail {
  person: {
    id: string; name: string; title: string; role: string;
    homepage?: string; photoUrl?: string; bio?: string; isPI?: boolean;
    stale?: boolean;
  };
  groups: { id: string; name: string; shortName?: string; color?: string }[];
  rooms: { id: string; number: string }[];
  papers: { id: string; title: string; venue?: string; year: number; citationCount?: number }[];
  news: { id: string; title: string; publishedAt: string }[];
  coauthors?: { id: string; name: string; sharedPaperCount: number }[];
}

export function PersonDossier({ id }: { id: string }) {
  const [data, setData] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kg/person/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [id]);

  if (loading) return <DossierLoading />;
  if (!data) return <DossierEmpty id={id} label="Person not found in the index." />;

  const p = data.person;
  const primary = data.groups[0];
  const accent = primary?.color;

  return (
    <div className="animate-fadeIn">
      <div className="px-5 pt-5 pb-4 flex gap-4 items-start border-b border-[var(--rule)]">
        <Portrait name={p.name} url={p.photoUrl} accent={accent} />
        <div className="min-w-0 flex-1">
          <span
            className="inline-block px-2 py-0.5 mb-2 rounded font-mono text-[9px] smallcaps tabular"
            style={{
              background: p.isPI ? "var(--cinnabar-soft)" : (accent ? `${accent}26` : "var(--gold-soft)"),
              color: p.isPI ? "var(--cinnabar)" : (accent ?? "var(--gold)"),
              border: `1px solid ${p.isPI ? "rgba(226,107,74,0.4)" : (accent ? `${accent}55` : "rgba(255,210,138,0.32)")}`,
            }}
          >
            {p.role.replaceAll("-", " ")}
          </span>
          <h2 className="font-display text-[26px] leading-[1.05] text-[var(--bone)]"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
            {p.name}
          </h2>
          <div className="mt-1 font-mono text-[11px] text-[var(--graphite-2)] tabular">{p.title}</div>
          {p.stale && (
            <div className="mt-2 font-mono text-[9px] smallcaps text-[var(--cinnabar)] tabular">
              · stale record
            </div>
          )}
        </div>
      </div>

      {p.bio && (
        <DossierSection label="Bio">
          <p className="font-body text-[13px] leading-relaxed text-[var(--bone-soft)] line-clamp-6">{p.bio}</p>
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

      {data.rooms.length > 0 && (
        <DossierSection label="Office">
          <ul className="flex gap-1.5">
            {data.rooms.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => openDossier({ kind: "room", id: r.id })}
                  className="font-mono text-[12px] tabular px-2 py-1 rounded border border-[var(--rule-strong)] text-[var(--bone)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition"
                >
                  32-G{r.number}
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      {data.papers.length > 0 && (
        <DossierSection label={`Recent papers · ${data.papers.length}`}>
          <ul className="space-y-2">
            {data.papers.slice(0, 6).map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openDossier({ kind: "paper", id: p.id })}
                  className="text-left w-full group"
                >
                  <div className="font-body text-[12px] text-[var(--bone)] leading-snug group-hover:text-[var(--gold)] transition">
                    {p.title}
                  </div>
                  <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular mt-0.5">
                    {p.venue ?? "—"} · {p.year}{typeof p.citationCount === "number" ? ` · ${p.citationCount} cites` : ""}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      {data.news && data.news.length > 0 && (
        <DossierSection label={`Press · ${data.news.length}`}>
          <ul className="space-y-1.5">
            {data.news.slice(0, 4).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openDossier({ kind: "news", id: n.id })}
                  className="text-left w-full group"
                >
                  <div className="font-body text-[12px] text-[var(--bone)] leading-snug group-hover:text-[var(--gold)] transition">
                    {n.title}
                  </div>
                  <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular mt-0.5">
                    {n.publishedAt.slice(0, 10)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      {data.coauthors && data.coauthors.length > 0 && (
        <DossierSection label="Coauthors">
          <ul className="space-y-1">
            {data.coauthors.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-[12px]">
                <button onClick={() => openDossier({ kind: "person", id: c.id })}
                        className="font-body text-[var(--bone)] hover:text-[var(--gold)] transition">
                  {c.name}
                </button>
                <span className="font-mono text-[10px] tabular text-[var(--graphite-2)]">
                  {c.sharedPaperCount} ×
                </span>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      {p.homepage && (
        <DossierSection label="Links">
          <a
            href={p.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-[var(--gold)] hover:text-[var(--bone)] transition tabular underline underline-offset-2"
          >
            {p.homepage.replace(/^https?:\/\//, "")} ↗
          </a>
        </DossierSection>
      )}

      <DossierFootActions kind="person" id={id} />
    </div>
  );
}

function Portrait({ name, url, accent }: { name: string; url?: string; accent?: string }) {
  if (url) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={url} alt={name} className="w-16 h-16 rounded-full object-cover shrink-0" />;
  }
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="w-16 h-16 rounded-full shrink-0 grid place-items-center font-display text-[20px] tabular"
      style={{
        background: `${accent ?? "#7a8aa6"}22`,
        color: accent ?? "var(--bone)",
        border: `1px solid ${accent ?? "var(--rule-strong)"}55`,
      }}
    >
      {initials}
    </div>
  );
}
