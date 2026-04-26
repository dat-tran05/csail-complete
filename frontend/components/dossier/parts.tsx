"use client";
import { useUI, type EntityKind } from "@/lib/store";

export function DossierTitle({ eyebrow, title, subtitle, accent }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div className="px-5 pt-4 pb-4 border-b border-[var(--rule)]">
      {eyebrow && (
        <span
          className="inline-block px-2 py-0.5 mb-3 rounded font-mono text-[9px] smallcaps tabular"
          style={{
            background: accent ? `${accent}26` : "var(--gold-soft)",
            color: accent ?? "var(--gold)",
            border: `1px solid ${accent ? `${accent}55` : "rgba(255,210,138,0.32)"}`,
          }}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className="font-display text-[28px] leading-[1.05] text-[var(--bone)]"
        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
      >
        {title}
      </h2>
      {subtitle && (
        <div className="mt-1 font-mono text-[11px] text-[var(--graphite-2)] tabular">
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function DossierSection({ label, children, action }: {
  label: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="px-5 py-4 border-b border-[var(--rule)]">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular">{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DossierFootActions({ kind, id }: { kind: EntityKind; id: string }) {
  const openDossier = useUI((s) => s.openDossier);
  return (
    <div className="px-5 py-4 flex items-center gap-2 sticky bottom-0 bg-[rgba(12,14,19,0.92)] backdrop-blur border-t border-[var(--rule)]">
      <button
        onClick={() => openDossier({ kind, id })}
        className="font-mono text-[10px] smallcaps text-[var(--graphite-2)] hover:text-[var(--gold)] transition px-2 py-1.5 border border-[var(--rule-strong)] rounded"
      >
        Open in atlas →
      </button>
      <button
        onClick={() => navigator.clipboard?.writeText(`${kind}:${id}`)}
        className="font-mono text-[10px] smallcaps text-[var(--graphite-2)] hover:text-[var(--bone)] transition px-2 py-1.5 border border-[var(--rule-strong)] rounded ml-auto"
      >
        copy id
      </button>
    </div>
  );
}

export function DossierEmpty({ id, label }: { id: string; label: string }) {
  return (
    <div className="px-5 py-8 text-center">
      <div className="font-display text-[20px] text-[var(--bone)] mb-2">No data yet</div>
      <p className="font-mono text-[11px] text-[var(--graphite-2)] tabular">
        {label}
        <br />
        <span className="opacity-60">id: {id}</span>
      </p>
    </div>
  );
}

export function DossierLoading() {
  return (
    <div className="px-5 py-8">
      <div className="h-6 w-2/3 bg-[var(--rule)] rounded mb-3 animate-pulseSoft" />
      <div className="h-3 w-1/2 bg-[var(--rule)] rounded mb-6 animate-pulseSoft" />
      <div className="h-3 w-full bg-[var(--rule)] rounded mb-2 animate-pulseSoft" />
      <div className="h-3 w-5/6 bg-[var(--rule)] rounded mb-2 animate-pulseSoft" />
      <div className="h-3 w-3/4 bg-[var(--rule)] rounded animate-pulseSoft" />
    </div>
  );
}
