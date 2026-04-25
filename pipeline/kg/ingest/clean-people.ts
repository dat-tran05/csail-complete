import { readFileSync } from "node:fs";
import type {
  Area, CsailRole, Group, GroupKind, Person, Project,
} from "../../../shared/schema";
import {
  areaId, classifyGroupKind, groupId, nowProvenance, personId, projectId,
  roomId as roomIdOf, slugifyArea, slugifyGroupUrl, slugifyProjectUrl,
} from "../../../shared/schema";

export interface RawPersonRecord {
  url: string;
  node_id: string;
  name: string;
  role_tag: string | null;
  role_category: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  room: string | null;
  room_map_url: string | null;
  photo_url: string | null;
  bio: string | null;
  website: string | null;
  research_areas: string[] | null;
  impact_areas: string[] | null;
  last_updated: string | null;
  projects: Array<{ title: string; url: string; teaser?: string; groups?: string[] }>;
  groups: Array<{ type: string | null; title: string; url: string; teaser?: string }>;
}

export interface CleanedRoomFK { id: string; number: string; floor: number; wing: string | null; }

export interface CleanedRecord {
  person: Person;
  rooms: CleanedRoomFK[];
  groups: Group[];
  projects: Project[];
  researchAreas: Area[];
  impactAreas: Area[];
}

const TITLE_MAP: Record<string, CsailRole> = {
  "professor": "professor",
  "associate professor": "associate-professor",
  "assistant professor": "assistant-professor",
  "graduate student": "graduate-student",
  "phd student": "phd-student",
  "meng student": "meng-student",
  "meng ra": "meng-student",
  "meng ta": "meng-student",
  "urop": "urop",
  "postdoctoral associate": "postdoc",
  "postdoctoral fellow": "postdoc",
  "research scientist": "research-scientist",
  "research affiliate": "research-affiliate",
  "visiting scientist": "visiting-scientist",
  "visiting student": "visiting-student",
  "visiting scholar": "visiting-scholar",
};

export function normalizeRole(title: string | null | undefined): CsailRole {
  if (!title) return "other";
  const lower = title.toLowerCase();
  if (TITLE_MAP[lower]) return TITLE_MAP[lower]!;
  if (/admin/i.test(title)) return "admin";
  if (/technical|systems analyst|systems engineer/i.test(title)) return "technical-staff";
  return "other";
}

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export function parseLastUpdated(raw: string | null | undefined): { iso?: string; stale: boolean } {
  if (!raw) return { stale: false };
  const m = raw.match(/Last updated (\w+) (\d+) '(\d{2})/);
  if (!m) return { stale: false };
  const monthIdx = MONTHS.indexOf(m[1]!.toLowerCase().slice(0, 3));
  if (monthIdx < 0) return { stale: false };
  const day = parseInt(m[2]!, 10);
  const yearShort = parseInt(m[3]!, 10);
  const year = yearShort >= 70 ? 1900 + yearShort : 2000 + yearShort;
  const date = new Date(Date.UTC(year, monthIdx, day));
  const iso = date.toISOString();
  const ageMs = Date.now() - date.getTime();
  const stale = ageMs > 1000 * 60 * 60 * 24 * 30 * 36;
  return { iso, stale };
}

export function parseRoom(raw: string | null | undefined): { id: string; floor: number; wing: string | null } | null {
  if (!raw) return null;
  const m = raw.match(/^32-([A-Z]?)(\d)\d{2}$/);
  if (!m) return null;
  const wing = m[1] || null;
  const floor = parseInt(m[2]!, 10);
  return { id: roomIdOf(raw), floor, wing };
}

export function cleanBio(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  return raw
    .replace(/\n(?=[a-z(])/g, " ")
    .replace(/(?<=[a-z,])\n/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function normalizePhone(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 7) return `617-${digits.slice(0,3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  return raw;
}

export function csailUrlSlug(url: string): string | undefined {
  const m = url.match(/\/person\/([^/?#]+)/);
  return m?.[1];
}

export function cleanPersonRecord(raw: RawPersonRecord): CleanedRecord {
  const provenance = nowProvenance("csail-directory", raw.url, 1.0);
  const lastUpdated = parseLastUpdated(raw.last_updated);
  const room = parseRoom(raw.room);

  const researchAreaIds: string[] = [];
  const researchAreas: Area[] = [];
  const seenRA = new Set<string>();
  for (const a of raw.research_areas ?? []) {
    const slug = slugifyArea(a);
    if (seenRA.has(slug)) continue;
    seenRA.add(slug);
    researchAreaIds.push(areaId(slug));
    researchAreas.push({ id: areaId(slug), slug, name: a, kind: "research" });
  }

  const impactAreaIds: string[] = [];
  const impactAreas: Area[] = [];
  const seenIA = new Set<string>();
  for (const a of raw.impact_areas ?? []) {
    const slug = slugifyArea(a);
    if (seenIA.has(slug)) continue;
    seenIA.add(slug);
    impactAreaIds.push(areaId(slug));
    impactAreas.push({ id: areaId(slug), slug, name: a, kind: "impact" });
  }

  const groups: Group[] = [];
  const seenGroup = new Set<string>();
  for (const g of raw.groups ?? []) {
    const slug = slugifyGroupUrl(g.url);
    if (seenGroup.has(slug)) continue;
    seenGroup.add(slug);
    const kind: GroupKind = classifyGroupKind(g.type);
    groups.push({
      id: groupId(slug),
      slug,
      name: g.title,
      kind,
      url: g.url,
      teaser: g.teaser,
      piIds: [],
      memberIds: [personId(raw.node_id)],
      projectIds: [],
      roomIds: [],
      paperIds: [],
      provenance: nowProvenance("csail-directory", g.url),
    });
  }

  const projects: Project[] = [];
  const seenProj = new Set<string>();
  for (const p of raw.projects ?? []) {
    const slug = slugifyProjectUrl(p.url);
    if (seenProj.has(slug)) continue;
    seenProj.add(slug);
    projects.push({
      id: projectId(slug),
      slug,
      title: p.title,
      url: p.url,
      teaser: p.teaser,
      groupIds: [],
      contributorIds: [personId(raw.node_id)],
      provenance: nowProvenance("csail-directory", p.url),
    });
  }

  const person: Person = {
    id: personId(raw.node_id),
    nodeId: raw.node_id,
    name: raw.name,
    title: raw.title ?? "",
    role: normalizeRole(raw.title),
    isPI: raw.role_tag === "PI",
    isCoreOrDual: raw.role_category === "Core/Dual",
    affiliation: "MIT CSAIL",
    aliases: {
      email: raw.email ?? undefined,
      csailUrlSlug: csailUrlSlug(raw.url),
      homepage: raw.website ?? undefined,
    },
    homepage: raw.website ?? undefined,
    phone: normalizePhone(raw.phone),
    photoUrl: raw.photo_url ?? undefined,
    bio: cleanBio(raw.bio),
    bioRaw: raw.bio ?? undefined,
    groupIds: groups.map((g) => g.id),
    projectIds: projects.map((p) => p.id),
    paperIds: [],
    roomIds: room ? [room.id] : [],
    researchAreaIds,
    impactAreaIds,
    stale: lastUpdated.stale,
    lastUpdatedSource: raw.last_updated ?? undefined,
    lastUpdatedAt: lastUpdated.iso,
    provenance,
  };

  return {
    person,
    rooms: room ? [{ id: room.id, number: raw.room!, floor: room.floor, wing: room.wing }] : [],
    groups,
    projects,
    researchAreas,
    impactAreas,
  };
}

export function readJsonlSync(path: string): RawPersonRecord[] {
  const text = readFileSync(path, "utf8");
  const out: RawPersonRecord[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    out.push(JSON.parse(line) as RawPersonRecord);
  }
  return out;
}
