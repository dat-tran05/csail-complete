"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface PaperRow {
  id: string; title: string; year: number; venue: string | null;
  citationCount: number | null; authors: string[];
}

export function PapersTab() {
  const [papers, setPapers] = useState<PaperRow[]>([]);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    fetch("/api/kg/papers?limit=2000")
      .then((r) => r.json())
      .then((d) => { setPapers(d.papers ?? []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--rule)]">
        <h2 className="font-display text-[28px] text-[var(--fg)]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          Papers
          <span className="ml-3 font-mono text-[14px] text-[var(--fg-mute)] tabular">{papers.length}</span>
        </h2>
        {papers.length === 0 && !loading && (
          <span className="font-mono text-[10px] smallcaps tabular text-[var(--accent)]">
            ingest pending
          </span>
        )}
      </div>
      {loading ? (
        <div className="font-mono text-[12px] tabular text-[var(--fg-mute)] py-12 text-center">loading papers…</div>
      ) : papers.length === 0 ? (
        <div className="font-body text-[14px] text-[var(--fg-soft)] py-12 text-center max-w-md mx-auto leading-relaxed">
          No papers in the knowledge graph yet. The Semantic Scholar enrichment pass will populate
          this view once it lands. Check back soon.
        </div>
      ) : (
        <table className="w-full font-body text-[13px] border-t border-[var(--rule-strong)]">
          <thead>
            <tr className="text-[var(--fg-mute)] font-mono text-[9px] smallcaps tabular">
              <th className="text-left py-2 px-2">Title</th>
              <th className="text-left py-2 px-2 w-32">Venue</th>
              <th className="text-left py-2 px-2 w-16">Year</th>
              <th className="text-right py-2 px-2 w-20">Cites</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr
                key={p.id}
                onClick={() => openDossier({ kind: "paper", id: p.id })}
                className="border-t border-[var(--rule)] hover:bg-[var(--paper-warp)] cursor-pointer"
              >
                <td className="py-2 px-2">
                  <div className="font-body text-[var(--fg)]">{p.title}</div>
                  <div className="font-mono text-[10px] tabular text-[var(--fg-mute)] mt-0.5">
                    {p.authors.slice(0, 4).join(", ")}{p.authors.length > 4 ? " et al." : ""}
                  </div>
                </td>
                <td className="py-2 px-2 font-mono text-[11px] tabular text-[var(--fg-soft)]">
                  {p.venue ?? "—"}
                </td>
                <td className="py-2 px-2 font-mono text-[12px] tabular text-[var(--fg-soft)]">{p.year}</td>
                <td className="py-2 px-2 text-right font-mono text-[12px] tabular text-[var(--fg-soft)]">
                  {p.citationCount ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
