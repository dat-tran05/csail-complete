"use client";
import { useEffect, useMemo, useState } from "react";
import { useUI } from "@/lib/store";
import { Dossier } from "@/components/dossier/Dossier";
import { PeopleTab } from "./PeopleTab";
import { GroupsTab } from "./GroupsTab";
import { ProjectsTab } from "./ProjectsTab";
import { PapersTab } from "./PapersTab";
import { NewsTab } from "./NewsTab";
import { AreasTab } from "./AreasTab";

type TabKey = "people" | "groups" | "projects" | "papers" | "news" | "areas";

const TABS: { key: TabKey; label: string }[] = [
  { key: "people",   label: "People" },
  { key: "groups",   label: "Groups" },
  { key: "projects", label: "Projects" },
  { key: "papers",   label: "Papers" },
  { key: "news",     label: "News" },
  { key: "areas",    label: "Areas" },
];

interface Counts {
  people: number; groups: number; projects: number;
  papers: number; news: number; areas: number;
}

export function DirectoryShell() {
  const [tab, setTab] = useState<TabKey>("people");
  const [counts, setCounts] = useState<Counts>({ people: 1493, groups: 70, projects: 223, papers: 0, news: 0, areas: 20 });

  // Pull true counts in a single round-trip
  useEffect(() => {
    fetch("/api/kg/counts")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCounts((c) => ({ ...c, ...d })); })
      .catch(() => {});
  }, []);

  return (
    <div className="relative pt-20 pb-32 px-10 max-w-[1480px] mx-auto">
      <DirectoryHeader counts={counts} />
      <DirectoryTabs tab={tab} onChange={setTab} counts={counts} />
      <div className="mt-8">
        {tab === "people"   && <PeopleTab />}
        {tab === "groups"   && <GroupsTab />}
        {tab === "projects" && <ProjectsTab />}
        {tab === "papers"   && <PapersTab />}
        {tab === "news"     && <NewsTab />}
        {tab === "areas"    && <AreasTab />}
      </div>
      <DirectoryColophon />
      <Dossier />
    </div>
  );
}

function DirectoryHeader({ counts }: { counts: Counts }) {
  return (
    <header className="mb-10 grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-7">
        <span className="font-mono text-[10px] smallcaps text-[var(--fg-mute)] tabular">
          The CSAIL Directory · ed. 2026 · 32-G7
        </span>
        <h1
          className="font-display text-[88px] mt-3 text-[var(--fg)]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50", lineHeight: 1.08 }}
        >
          <span className="block">A drafting</span>
          <span className="block mt-2"><em className="italic font-light">paper</em> of CSAIL.</span>
        </h1>
        <p className="font-body text-[15px] leading-[1.55] text-[var(--fg-soft)] mt-5 max-w-xl">
          Every person, group, project, paper, news clipping, and area indexed across the
          institute — pulled from the Stata directory, Semantic Scholar, and CSAIL News, then
          stitched into a knowledge graph. Slice it by group, area, role, or floor.
        </p>
      </div>
      <div className="col-span-12 md:col-span-5 md:pt-12">
        <CountTable counts={counts} />
      </div>
    </header>
  );
}

function CountTable({ counts }: { counts: Counts }) {
  const rows: [keyof Counts, string][] = [
    ["people",   "people"],
    ["groups",   "groups"],
    ["projects", "projects"],
    ["papers",   "papers"],
    ["news",     "press clippings"],
    ["areas",    "research areas"],
  ];
  return (
    <table className="w-full font-mono text-[12px] tabular border-t border-b border-[var(--rule-strong)]">
      <tbody>
        {rows.map(([key, label]) => (
          <tr key={key} className="border-t border-[var(--rule)]">
            <td className="py-2 pr-4 text-[var(--fg-mute)] smallcaps">{label}</td>
            <td className="py-2 text-right font-display text-[24px] tabular text-[var(--fg)]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}>
              {counts[key].toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DirectoryTabs({ tab, onChange, counts }: {
  tab: TabKey; onChange: (t: TabKey) => void; counts: Counts
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-t border-b border-[var(--rule-strong)] py-2 sticky top-12 bg-[var(--bg)]/95 backdrop-blur z-20">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={[
            "flex items-baseline gap-2 px-4 py-1.5 rounded-full transition",
            tab === t.key
              ? "bg-[var(--fg)] text-[var(--bg)]"
              : "text-[var(--fg-soft)] hover:text-[var(--fg)] hover:bg-[var(--paper-warp)]"
          ].join(" ")}
        >
          <span className="font-display text-[14px]">{t.label}</span>
          <span className={`font-mono text-[10px] tabular ${tab === t.key ? "opacity-70" : "text-[var(--fg-mute)]"}`}>
            {counts[t.key].toLocaleString()}
          </span>
        </button>
      ))}
    </nav>
  );
}

function DirectoryColophon() {
  return (
    <footer className="mt-24 pt-6 border-t border-[var(--rule-strong)] font-mono text-[10px] smallcaps text-[var(--fg-mute)] tabular flex items-center justify-between">
      <span>set in fraunces &amp; ibm plex · printed on drafting paper · neo4j-backed</span>
      <span>cambridge, ma · 32-G</span>
    </footer>
  );
}
