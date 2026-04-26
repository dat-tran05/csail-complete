"use client";
import { useUI } from "@/lib/store";

const FLOORS = [
  { n: 9, label: "9th",  group: "—",                 stat: "" },
  { n: 8, label: "8th",  group: "—",                 stat: "" },
  { n: 7, label: "7th",  group: "Gates Tower",       stat: "1,493 indexed · 70 groups" },
  { n: 6, label: "6th",  group: "—",                 stat: "" },
  { n: 5, label: "5th",  group: "—",                 stat: "" },
  { n: 4, label: "4th",  group: "—",                 stat: "" },
  { n: 3, label: "3rd",  group: "—",                 stat: "" },
  { n: 2, label: "2nd",  group: "—",                 stat: "" },
  { n: 1, label: "1st",  group: "lobby",             stat: "" },
];

export function FloorStrip() {
  const view = useUI((s) => s.view);
  const enterFloor = useUI((s) => s.enterFloor);
  if (view !== "building") return null;

  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 pointer-events-auto animate-fadeUp">
      <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] mb-3 text-right">
        Floors · 32-G
      </div>
      <ul className="flex flex-col gap-px">
        {FLOORS.map((f) => {
          const active = f.n === 7;
          return (
            <li key={f.n}>
              <button
                disabled={!active}
                onClick={() => enterFloor(f.n)}
                className={[
                  "group flex items-baseline justify-end gap-3 w-[260px] py-2 pr-4 pl-3 border-r-2 transition-all",
                  active
                    ? "border-[var(--gold)] hover:bg-[var(--gold-soft)] cursor-pointer"
                    : "border-[var(--rule)] opacity-45 cursor-not-allowed"
                ].join(" ")}
              >
                <span className="font-display tabular text-[28px] leading-none text-[var(--bone)]"
                      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
                  {f.n}
                </span>
                <span className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] flex-1 text-left ml-2">
                  {f.group}
                </span>
                <span className="font-mono text-[9px] tabular text-[var(--graphite-2)] text-right truncate max-w-[140px]">
                  {f.stat}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] mt-3 text-right tabular">
        Floor 7 only · for now
      </div>
    </div>
  );
}
