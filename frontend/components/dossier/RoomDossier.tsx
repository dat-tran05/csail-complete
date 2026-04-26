"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { DossierTitle, DossierSection, DossierFootActions, DossierLoading, DossierEmpty } from "./parts";

interface RoomDetail {
  room: { id: string; number: string; floor: number; type: string; label?: string };
  groups: { id: string; name: string; shortName?: string; color?: string; url?: string }[];
  members: { id: string; name: string; homepage?: string; photoUrl?: string; title?: string }[];
  activity: { papersThisMonth: number; collaborations: number };
  recentPapers?: { id: string; title: string; year: number; venue?: string }[];
  recentNews?: { id: string; slug?: string; title: string; publishedAt: string; source?: string }[];
  projects?: { id: string; slug?: string; title: string; teaser?: string }[];
}

export function RoomDossier({ id }: { id: string }) {
  const [data, setData] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kg/room/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [id]);

  if (loading) return <DossierLoading />;
  if (!data) return <DossierEmpty id={id} label="Room not found in the index." />;

  const primary = data.groups[0];
  const accent = primary?.color ?? "var(--gold)";

  return (
    <div className="animate-fadeIn">
      <DossierTitle
        eyebrow={`Floor ${data.room.floor} · ${data.room.type}`}
        title={primary?.name ?? data.room.label ?? `Room ${data.room.number}`}
        subtitle={`32-G${data.room.number} · ${data.room.id}`}
        accent={primary?.color}
      />

      <DossierSection label={`Group${data.groups.length === 1 ? "" : "s"}`}>
        {data.groups.length === 0 ? (
          <p className="font-mono text-[11px] text-[var(--graphite-2)]">— no group occupies this room</p>
        ) : (
          <ul className="space-y-2">
            {data.groups.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => openDossier({ kind: "group", id: g.id })}
                  className="w-full text-left flex items-center gap-2 group"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color, boxShadow: `0 0 6px ${g.color}` }} />
                  <span className="font-display text-[15px] text-[var(--bone)] group-hover:text-[var(--gold)] transition">
                    {g.name}
                  </span>
                  {g.shortName && (
                    <span className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular ml-auto">
                      {g.shortName}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DossierSection>

      <DossierSection label={`Members · ${data.members.length}`}>
        {data.members.length === 0 ? (
          <p className="font-mono text-[11px] text-[var(--graphite-2)]">— directory ingest pending for this room</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {data.members.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => openDossier({ kind: "person", id: m.id })}
                  className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-[var(--rule)] transition"
                >
                  <Avatar name={m.name} photoUrl={m.photoUrl} accent={accent} />
                  <div className="min-w-0">
                    <div className="font-body text-[12px] text-[var(--bone)] truncate leading-tight">
                      {m.name}
                    </div>
                    {m.title && (
                      <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] truncate tabular">
                        {m.title}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DossierSection>

      <DossierSection label="Activity">
        <div className="grid grid-cols-2 gap-3">
          <Stat n={data.activity.papersThisMonth} label="papers · 30 d" />
          <Stat n={data.activity.collaborations} label="collaborations" />
        </div>
      </DossierSection>

      {data.recentPapers && data.recentPapers.length > 0 && (
        <DossierSection label="Recent papers">
          <ul className="space-y-1.5">
            {data.recentPapers.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openDossier({ kind: "paper", id: p.id })}
                  className="w-full text-left group"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[9px] tabular text-[var(--graphite-2)] shrink-0">{p.year}</span>
                    <span className="font-body text-[12px] text-[var(--bone)] group-hover:text-[var(--gold)] transition leading-snug line-clamp-2">
                      {p.title}
                    </span>
                  </div>
                  {p.venue && (
                    <div className="ml-7 font-mono text-[9px] smallcaps text-[var(--graphite-2)] truncate">
                      {p.venue}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      {data.recentNews && data.recentNews.length > 0 && (
        <DossierSection label="In the news">
          <ul className="space-y-1.5">
            {data.recentNews.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openDossier({ kind: "news", id: n.slug ?? n.id })}
                  className="w-full text-left group"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[9px] tabular text-[var(--graphite-2)] shrink-0">
                      {n.publishedAt ? n.publishedAt.slice(0, 7) : ""}
                    </span>
                    <span className="font-body text-[12px] text-[var(--bone)] group-hover:text-[var(--gold)] transition leading-snug line-clamp-2">
                      {n.title}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      {data.projects && data.projects.length > 0 && (
        <DossierSection label="Active projects">
          <ul className="space-y-1.5">
            {data.projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openDossier({ kind: "project", id: p.slug ?? p.id })}
                  className="w-full text-left group"
                >
                  <div className="font-body text-[12px] text-[var(--bone)] group-hover:text-[var(--gold)] transition leading-snug">
                    {p.title}
                  </div>
                  {p.teaser && (
                    <div className="font-mono text-[10px] text-[var(--graphite-2)] line-clamp-1 mt-0.5">
                      {p.teaser}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      <DossierFootActions kind="room" id={id} />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-display tabular text-[24px] text-[var(--bone)] leading-none"
           style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}>
        {n}
      </div>
      <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] mt-0.5 tabular">
        {label}
      </div>
    </div>
  );
}

function Avatar({ name, photoUrl, accent }: { name: string; photoUrl?: string; accent?: string }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  if (photoUrl) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={photoUrl} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0" />;
  }
  return (
    <div
      className="w-7 h-7 rounded-full shrink-0 grid place-items-center font-mono text-[10px] tabular"
      style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
    >
      {initials}
    </div>
  );
}
