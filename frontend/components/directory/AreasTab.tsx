"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface AreaRow { id: string; slug: string; name: string; kind: string; groupCount: number }

export function AreasTab() {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    fetch("/api/kg/areas")
      .then((r) => r.json())
      .then((d) => { setAreas(d.areas ?? []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const research = areas.filter((a) => a.kind === "research");
  const impact   = areas.filter((a) => a.kind === "impact");
  const maxCount = Math.max(1, ...areas.map((a) => a.groupCount));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--rule)]">
        <h2 className="font-display text-[28px] text-[var(--fg)]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          Areas
          <span className="ml-3 font-mono text-[14px] text-[var(--fg-mute)] tabular">{areas.length}</span>
        </h2>
      </div>
      {loading ? (
        <div className="font-mono text-[12px] tabular text-[var(--fg-mute)] py-12 text-center">loading areas…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Cloud title="Research areas" rows={research} max={maxCount} onPick={(id) => openDossier({ kind: "area", id })} />
          <Cloud title="Impact areas"   rows={impact}   max={maxCount} onPick={(id) => openDossier({ kind: "area", id })} />
        </div>
      )}
    </div>
  );
}

function Cloud({ title, rows, max, onPick }: {
  title: string; rows: AreaRow[]; max: number; onPick: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="font-mono text-[9px] smallcaps tabular text-[var(--fg-mute)] mb-3 pb-2 border-b border-[var(--rule)]">
        {title} · {rows.length}
      </h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {rows.map((a) => {
          const t = a.groupCount / max;
          const size = 14 + Math.round(t * 16);  // 14..30 px
          const opacity = 0.55 + t * 0.45;
          return (
            <li key={a.id}>
              <button
                onClick={() => onPick(a.id)}
                style={{ fontSize: `${size}px`, opacity, fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
                className="font-display text-[var(--fg)] hover:text-[var(--accent)] transition leading-tight"
              >
                {a.name}
                <span className="font-mono text-[10px] tabular text-[var(--fg-mute)] ml-1.5 align-baseline">
                  {a.groupCount}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
