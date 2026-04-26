"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { DossierTitle, DossierSection, DossierFootActions, DossierLoading, DossierEmpty } from "./parts";

interface GroupDetail {
  group: {
    id: string; name: string; shortName?: string; kind: string;
    teaser?: string; color?: string; url?: string;
  };
  pis: { id: string; name: string; photoUrl?: string }[];
  members: { id: string; name: string; role?: string }[];
  rooms: { id: string; number: string }[];
  projects: { id: string; title: string }[];
  paperCount: number;
}

export function GroupDossier({ id }: { id: string }) {
  const [data, setData] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kg/group/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [id]);

  if (loading) return <DossierLoading />;
  if (!data) return <DossierEmpty id={id} label="Group not found in the index." />;

  const g = data.group;

  return (
    <div className="animate-fadeIn">
      <DossierTitle
        eyebrow={g.kind === "community-of-research" ? "Community of research" : "Research group"}
        title={g.name}
        subtitle={g.shortName ? `${g.shortName} · ${g.id}` : g.id}
        accent={g.color}
      />

      {g.teaser && (
        <DossierSection label="Teaser">
          <p className="font-body text-[13px] leading-relaxed text-[var(--bone-soft)]">{g.teaser}</p>
        </DossierSection>
      )}

      {data.pis.length > 0 && (
        <DossierSection label={`Principal investigators · ${data.pis.length}`}>
          <ul className="flex flex-wrap gap-2">
            {data.pis.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openDossier({ kind: "person", id: p.id })}
                  className="font-body text-[12px] text-[var(--bone)] hover:text-[var(--gold)] transition px-2 py-1 rounded border border-[var(--rule-strong)]"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      <DossierSection label={`Members · ${data.members.length}`}>
        {data.members.length === 0 ? (
          <p className="font-mono text-[11px] text-[var(--graphite-2)]">— ingest pending</p>
        ) : (
          <ul className="grid grid-cols-2 gap-1">
            {data.members.slice(0, 24).map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => openDossier({ kind: "person", id: m.id })}
                  className="text-left font-body text-[12px] text-[var(--bone)] hover:text-[var(--gold)] transition truncate w-full"
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {data.members.length > 24 && (
          <div className="mt-2 font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular">
            +{data.members.length - 24} more
          </div>
        )}
      </DossierSection>

      {data.rooms.length > 0 && (
        <DossierSection label="Rooms">
          <ul className="flex flex-wrap gap-1.5">
            {data.rooms.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => openDossier({ kind: "room", id: r.id })}
                  className="font-mono text-[11px] tabular px-2 py-1 rounded border border-[var(--rule-strong)] text-[var(--bone)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition"
                >
                  32-G{r.number}
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      {data.projects.length > 0 && (
        <DossierSection label={`Projects · ${data.projects.length}`}>
          <ul className="space-y-1">
            {data.projects.slice(0, 8).map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openDossier({ kind: "project", id: p.id })}
                  className="text-left font-body text-[12px] text-[var(--bone)] hover:text-[var(--gold)] transition w-full truncate"
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </DossierSection>
      )}

      <DossierSection label="Stats">
        <div className="grid grid-cols-3 gap-3">
          <Stat n={data.members.length} label="members" />
          <Stat n={data.projects.length} label="projects" />
          <Stat n={data.paperCount} label="papers" />
        </div>
      </DossierSection>

      {g.url && (
        <DossierSection label="Site">
          <a
            href={g.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-[var(--gold)] hover:text-[var(--bone)] transition tabular underline underline-offset-2"
          >
            {g.url.replace(/^https?:\/\//, "")} ↗
          </a>
        </DossierSection>
      )}

      <DossierFootActions kind="group" id={id} />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-display tabular text-[22px] text-[var(--bone)] leading-none"
           style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}>{n}</div>
      <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] mt-0.5 tabular">{label}</div>
    </div>
  );
}
