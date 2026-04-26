"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface NewsRow {
  id: string; title: string; publishedAt: string; url: string;
  excerpt: string | null; imageUrl: string | null;
}

export function NewsTab() {
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const openDossier = useUI((s) => s.openDossier);

  useEffect(() => {
    fetch("/api/kg/news?limit=500")
      .then((r) => r.json())
      .then((d) => { setNews(d.news ?? []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--rule)]">
        <h2 className="font-display text-[28px] text-[var(--fg)]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          News
          <span className="ml-3 font-mono text-[14px] text-[var(--fg-mute)] tabular">{news.length}</span>
        </h2>
        {news.length === 0 && !loading && (
          <span className="font-mono text-[10px] smallcaps tabular text-[var(--accent)]">
            ingest pending
          </span>
        )}
      </div>
      {loading ? (
        <div className="font-mono text-[12px] tabular text-[var(--fg-mute)] py-12 text-center">loading press…</div>
      ) : news.length === 0 ? (
        <div className="font-body text-[14px] text-[var(--fg-soft)] py-12 text-center max-w-md mx-auto leading-relaxed">
          No press clippings yet. The CSAIL News scrape will populate this timeline soon.
        </div>
      ) : (
        <ol className="space-y-1 border-l-2 border-[var(--rule-strong)] pl-6 ml-1">
          {news.map((n) => (
            <li key={n.id} className="relative py-3">
              <span className="absolute -left-[31px] top-4 w-2 h-2 bg-[var(--accent)] rounded-full" />
              <button
                onClick={() => openDossier({ kind: "news", id: n.id })}
                className="text-left w-full group"
              >
                <span className="font-mono text-[10px] smallcaps tabular text-[var(--fg-mute)]">
                  {n.publishedAt.slice(0, 10)}
                </span>
                <h3 className="font-display text-[18px] leading-tight text-[var(--fg)] group-hover:text-[var(--accent)] transition mt-0.5"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
                  {n.title}
                </h3>
                {n.excerpt && (
                  <p className="font-body text-[13px] text-[var(--fg-soft)] line-clamp-2 mt-1 max-w-2xl leading-snug">
                    {n.excerpt}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
