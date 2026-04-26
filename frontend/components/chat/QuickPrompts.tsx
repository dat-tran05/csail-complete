"use client";

const PROMPTS = [
  "Who works on programming languages on Floor 7?",
  "Recent papers from the HCI Lab",
  "Where is Daniel Jackson's office?",
  "What groups share the Gates Tower?",
  "Show me the HCI co-author network",
];

export function QuickPrompts({ onPick }: { onPick: (msg: string) => void }) {
  return (
    <div className="animate-fadeUp flex flex-col gap-1.5">
      <span className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular px-1">
        Try asking
      </span>
      <div className="flex flex-wrap gap-1.5">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="font-body text-[12px] px-3 py-1.5 rounded-full border border-[var(--rule-strong)] text-[var(--bone-soft)] hover:text-[var(--bone)] hover:border-[var(--gold)] transition bg-[var(--ink-glass)] backdrop-blur"
          >
            <span className="text-[var(--graphite-2)] mr-1.5">›</span>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
