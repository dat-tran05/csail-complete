"use client";
import { useEffect, useMemo, useState } from "react";
import { useUI } from "@/lib/store";

interface PersonRow {
  id: string;
  name: string;
  title: string;
  role: string;
  isPI: boolean;
  photoUrl: string | null;
  stale: boolean;
  room: { id: string; number: string; floor: number } | null;
  groups: { id: string; name: string; color?: string }[];
  paperCount: number;
}

interface Group { id: string; name: string; color?: string | null }

type Density = "grid" | "table" | "dense";

const ROLES: { value: string; label: string }[] = [
  { value: "",                  label: "All roles" },
  { value: "professor",         label: "Professor" },
  { value: "associate-professor", label: "Assoc. Prof." },
  { value: "assistant-professor", label: "Asst. Prof." },
  { value: "postdoc",           label: "Postdoc" },
  { value: "research-scientist", label: "Research Scientist" },
  { value: "phd-student",       label: "PhD Student" },
  { value: "graduate-student",  label: "Graduate Student" },
  { value: "meng-student",      label: "MEng Student" },
  { value: "visiting-scientist", label: "Visiting Scientist" },
  { value: "admin",             label: "Admin" },
  { value: "technical-staff",   label: "Technical Staff" },
];

export function PeopleTab() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [density, setDensity] = useState<Density>("grid");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [showStale, setShowStale] = useState(false);

  useEffect(() => {
    fetch("/api/kg/groups").then((r) => r.json()).then((d) => setGroups(d.groups ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "240" });
    if (q.trim())   params.set("q", q.trim());
    if (group)      params.set("group", group);
    if (role)       params.set("role", role);
    if (floor)      params.set("floor", floor);
    fetch(`/api/kg/people?${params}`)
      .then((r) => r.json())
      .then((d) => { setPeople(d.people ?? []); setLoading(false); })
      .catch(() => { setPeople([]); setLoading(false); });
  }, [q, group, role, floor]);

  const filtered = useMemo(
    () => showStale ? people : people.filter((p) => !p.stale),
    [people, showStale]
  );

  return (
    <div className="grid grid-cols-12 gap-8">
      <aside className="col-span-12 md:col-span-3">
        <Filters
          q={q} setQ={setQ}
          groups={groups} group={group} setGroup={setGroup}
          role={role} setRole={setRole}
          floor={floor} setFloor={setFloor}
          showStale={showStale} setShowStale={setShowStale}
        />
      </aside>
      <main className="col-span-12 md:col-span-9">
        <Toolbar count={filtered.length} total={people.length} density={density} setDensity={setDensity} loading={loading} />
        {loading && filtered.length === 0 ? (
          <div className="font-mono text-[12px] tabular text-[var(--fg-mute)] py-12 text-center">
            loading directory…
          </div>
        ) : filtered.length === 0 ? (
          <div className="font-mono text-[12px] tabular text-[var(--fg-mute)] py-12 text-center">
            no results · adjust filters
          </div>
        ) : density === "grid" ? (
          <Grid people={filtered} />
        ) : density === "dense" ? (
          <DenseGrid people={filtered} />
        ) : (
          <Table people={filtered} />
        )}
      </main>
    </div>
  );
}

function Filters({
  q, setQ, groups, group, setGroup, role, setRole, floor, setFloor, showStale, setShowStale,
}: {
  q: string; setQ: (v: string) => void;
  groups: Group[]; group: string; setGroup: (v: string) => void;
  role: string; setRole: (v: string) => void;
  floor: string; setFloor: (v: string) => void;
  showStale: boolean; setShowStale: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6 sticky top-32">
      <FilterSection label="Search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="name…"
          className="w-full px-3 py-2 bg-transparent border-b border-[var(--rule-strong)] focus:border-[var(--accent)] outline-none font-body text-[14px] text-[var(--fg)] placeholder-[var(--fg-mute)]"
        />
      </FilterSection>
      <FilterSection label="Group">
        <ChipSelect
          value={group}
          options={[{ value: "", label: "All" }, ...groups.slice(0, 20).map((g) => ({ value: g.id, label: g.name, color: g.color ?? undefined }))]}
          onChange={setGroup}
        />
      </FilterSection>
      <FilterSection label="Role">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-2 py-2 bg-transparent border border-[var(--rule-strong)] rounded font-body text-[12px] text-[var(--fg)]"
        >
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </FilterSection>
      <FilterSection label="Floor">
        <div className="flex flex-wrap gap-1">
          {["", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((f) => (
            <button
              key={f || "any"}
              onClick={() => setFloor(f)}
              className={[
                "font-mono text-[11px] tabular px-2 py-1 rounded border",
                floor === f ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]" : "border-[var(--rule-strong)] text-[var(--fg-soft)] hover:border-[var(--accent)]"
              ].join(" ")}
            >
              {f || "any"}
            </button>
          ))}
        </div>
      </FilterSection>
      <FilterSection label="Other">
        <label className="flex items-center gap-2 font-mono text-[12px] text-[var(--fg-soft)] cursor-pointer">
          <input type="checkbox" checked={showStale} onChange={(e) => setShowStale(e.target.checked)} className="accent-[var(--accent)]" />
          show stale records
        </label>
      </FilterSection>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-[9px] smallcaps text-[var(--fg-mute)] tabular mb-2 pb-1 border-b border-[var(--rule)]">
        {label}
      </h3>
      {children}
    </div>
  );
}

function ChipSelect({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string; color?: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
      {options.map((o) => (
        <li key={o.value || "any"}>
          <button
            onClick={() => onChange(o.value)}
            className={[
              "font-mono text-[11px] tabular px-2 py-0.5 rounded-full border flex items-center gap-1.5",
              value === o.value
                ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]"
                : "border-[var(--rule-strong)] text-[var(--fg-soft)] hover:border-[var(--accent)]"
            ].join(" ")}
          >
            {o.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.color }} />}
            {o.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Toolbar({ count, total, density, setDensity, loading }: {
  count: number; total: number; density: Density; setDensity: (d: Density) => void; loading: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--rule)]">
      <h2 className="font-display text-[28px] text-[var(--fg)]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
        People
        <span className="ml-3 font-mono text-[14px] text-[var(--fg-mute)] tabular">
          {count.toLocaleString()}{count !== total ? ` of ${total.toLocaleString()}` : ""}{loading && " · loading…"}
        </span>
      </h2>
      <div className="flex gap-1">
        {(["grid", "table", "dense"] as Density[]).map((d) => (
          <button
            key={d}
            onClick={() => setDensity(d)}
            className={[
              "font-mono text-[10px] smallcaps tabular px-2.5 py-1 rounded",
              density === d ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--fg-soft)] hover:bg-[var(--paper-warp)]"
            ].join(" ")}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── grid card view ─── */
function Grid({ people }: { people: PersonRow[] }) {
  return (
    <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {people.map((p) => <Card key={p.id} p={p} />)}
    </ul>
  );
}

function Card({ p }: { p: PersonRow }) {
  const openDossier = useUI((s) => s.openDossier);
  const accent = p.groups[0]?.color;
  return (
    <li>
      <button
        onClick={() => openDossier({ kind: "person", id: p.id })}
        className="w-full text-left group p-3 border border-[var(--rule)] hover:border-[var(--accent)] hover:shadow-[0_2px_24px_rgba(181,68,32,0.08)] transition rounded-sm bg-[var(--bg-1)]/60"
      >
        <div className="flex items-center gap-3">
          <Portrait name={p.name} url={p.photoUrl} accent={accent} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[16px] leading-tight text-[var(--fg)] truncate"
                 style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
              {p.name}
            </div>
            <div className="font-mono text-[10px] smallcaps text-[var(--fg-mute)] truncate tabular mt-0.5">
              {p.title || p.role.replaceAll("-", " ")}
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {p.groups.slice(0, 3).map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center gap-1 font-mono text-[9px] tabular px-1.5 py-0.5 rounded-full"
              style={{ background: `${g.color}1c`, color: g.color, border: `1px solid ${g.color}55` }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: g.color }} />
              {g.name}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] tabular text-[var(--fg-mute)]">
          <span>{p.room ? `32-G${p.room.number}` : "—"}</span>
          <span>{p.paperCount > 0 ? `${p.paperCount} papers` : "—"}</span>
        </div>
      </button>
    </li>
  );
}

function Portrait({ name, url, accent }: { name: string; url: string | null; accent?: string }) {
  if (url) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={url} alt={name} className="w-12 h-12 rounded-full object-cover shrink-0" />;
  }
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="w-12 h-12 rounded-full shrink-0 grid place-items-center font-display text-[14px] tabular"
      style={{
        background: accent ? `${accent}22` : "var(--paper-warp)",
        color: accent ?? "var(--fg)",
        border: `1px solid ${accent ?? "var(--rule-strong)"}`,
      }}
    >
      {initials}
    </div>
  );
}

/* ─── table view ─── */
function Table({ people }: { people: PersonRow[] }) {
  const openDossier = useUI((s) => s.openDossier);
  return (
    <table className="w-full font-body text-[13px] border-t border-[var(--rule-strong)]">
      <thead>
        <tr className="text-[var(--fg-mute)] font-mono text-[9px] smallcaps tabular">
          <th className="text-left py-2 px-2">Name</th>
          <th className="text-left py-2 px-2">Title</th>
          <th className="text-left py-2 px-2">Group</th>
          <th className="text-left py-2 px-2 w-24">Room</th>
          <th className="text-right py-2 px-2 w-20">Papers</th>
        </tr>
      </thead>
      <tbody>
        {people.map((p) => (
          <tr
            key={p.id}
            onClick={() => openDossier({ kind: "person", id: p.id })}
            className="border-t border-[var(--rule)] hover:bg-[var(--paper-warp)] cursor-pointer"
          >
            <td className="py-2 px-2 font-display text-[15px] text-[var(--fg)]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>{p.name}</td>
            <td className="py-2 px-2 text-[var(--fg-soft)] truncate max-w-[260px]">{p.title || p.role.replaceAll("-", " ")}</td>
            <td className="py-2 px-2">
              {p.groups[0] && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.groups[0].color }} />
                  {p.groups[0].name}
                </span>
              )}
            </td>
            <td className="py-2 px-2 font-mono text-[12px] tabular text-[var(--fg-soft)]">
              {p.room ? `32-G${p.room.number}` : "—"}
            </td>
            <td className="py-2 px-2 text-right font-mono text-[12px] tabular text-[var(--fg-soft)]">
              {p.paperCount || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── dense single-line view ─── */
function DenseGrid({ people }: { people: PersonRow[] }) {
  const openDossier = useUI((s) => s.openDossier);
  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 font-mono text-[12px] tabular">
      {people.map((p) => (
        <li key={p.id} className="border-b border-[var(--rule)] py-1">
          <button onClick={() => openDossier({ kind: "person", id: p.id })} className="text-left w-full flex items-baseline gap-2">
            {p.groups[0] && <span className="w-1 h-1 rounded-full mt-0.5 shrink-0" style={{ background: p.groups[0].color }} />}
            <span className="font-body text-[var(--fg)] truncate">{p.name}</span>
            <span className="ml-auto text-[10px] text-[var(--fg-mute)] shrink-0">{p.room ? `G${p.room.number}` : ""}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
