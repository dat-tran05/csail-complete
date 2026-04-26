"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { DossierTitle, DossierSection, DossierFootActions, DossierLoading, DossierEmpty } from "./parts";

interface AreaDetail {
  area: { id: string; name: string; kind: string };
  groups: { id: string; name: string; color?: string; shortName?: string }[];
  peopleCount: number;
  paperCount: number;
}

export function AreaDossier({ id }: { id: string }) {
  const [data, setData] = useState<AreaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kg/area/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [id]);

  if (loading) return <DossierLoading />;
  if (!data) return <DossierEmpty id={id} label="Area not found in the index." />;

  return (
    <div className="animate-fadeIn">
      <DossierTitle
        eyebrow={data.area.kind === "impact" ? "Impact area" : "Research area"}
        title={data.area.name}
        subtitle={data.area.id}
      />

      <DossierSection label="Stats">
        <div className="grid grid-cols-3 gap-3">
          <Stat n={data.groups.length} label="groups" />
          <Stat n={data.peopleCount} label="people" />
          <Stat n={data.paperCount} label="papers" />
        </div>
      </DossierSection>

      <DossierSection label={`Groups · ${data.groups.length}`}>
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

      <DossierFootActions kind="area" id={id} />
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
