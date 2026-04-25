# CSAIL Knowledge Graph (Neo4j) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Neo4j as the canonical CSAIL knowledge store. Ingest 1,493 people from `data/people.jsonl`, enrich Floor 7 cohort with full Semantic Scholar paper data + CSAIL news, expose a typed agent access layer, and wire the chat panel to one live Cypher-backed query for tomorrow's demo.

**Architecture:** Local Neo4j 5 (Docker, APOC enabled) keyed by CSAIL `node_id`. TypeScript shared schema mirrors Cypher node/edge shapes. Ingest is idempotent. Floor 7 enrichment is uncapped (deep) while general enrichment is capped at 20 papers per person. Viz path stays on `data/*.json` for the demo; KG drives the chat panel.

**Tech Stack:** Bun, TypeScript (strict, verbatimModuleSyntax), Neo4j 5 Community + APOC, `neo4j-driver`, cheerio (already installed), Semantic Scholar Graph API, native fetch.

**Spec:** `docs/superpowers/specs/2026-04-25-knowledge-graph-neo4j-design.md` (committed `26c624e`).

---

## Task 1: Docker Compose for Neo4j

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  neo4j:
    image: neo4j:5.20.0-community
    container_name: csail-neo4j
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/csail-dev-password
      NEO4J_PLUGINS: '["apoc"]'
      NEO4J_dbms_security_procedures_unrestricted: apoc.*
      NEO4J_dbms_memory_heap_initial__size: 512m
      NEO4J_dbms_memory_heap_max__size: 1G
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - ./snapshots:/snapshots
    healthcheck:
      test: ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:7474 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 20s

volumes:
  neo4j_data:
  neo4j_logs:
```

- [ ] **Step 2: Write `.env.example`**

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=csail-dev-password

# Optional: Semantic Scholar API key (raises rate limits)
SEMANTIC_SCHOLAR_API_KEY=
```

- [ ] **Step 3: Add to `.gitignore`**

Append:
```
.env
snapshots/*.dump
!snapshots/.gitkeep
data/floor-7-author-candidates.jsonl
data/disambiguation-flags.jsonl
data/news-orphans.jsonl
data/s2-progress.jsonl
```

- [ ] **Step 4: Create `snapshots/.gitkeep`** (empty file)

- [ ] **Step 5: Bring up Neo4j and verify**

```bash
docker compose up -d
sleep 25
curl -s -u neo4j:csail-dev-password -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"RETURN 1 AS ok"}]}' \
  http://localhost:7474/db/neo4j/tx/commit | grep -q '"ok"'
echo "OK"
```

Expected: `OK` printed.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example .gitignore snapshots/.gitkeep
git commit -m "infra: Neo4j 5 + APOC via docker compose"
```

---

## Task 2: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `neo4j-driver` dependency**

```bash
bun add neo4j-driver
```

- [ ] **Step 2: Verify import works**

Create `/tmp/neo4j-smoke.ts`:
```ts
import neo4j from "neo4j-driver";
const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "csail-dev-password"));
const session = driver.session();
const r = await session.run("RETURN 1 AS ok");
console.log(r.records[0]!.get("ok").toNumber());
await session.close();
await driver.close();
```

```bash
bun /tmp/neo4j-smoke.ts
```

Expected: `1`. Then `rm /tmp/neo4j-smoke.ts`.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "deps: add neo4j-driver"
```

---

## Task 3: Shared schema — foundational types

**Files:**
- Create: `shared/schema/ids.ts`
- Create: `shared/schema/provenance.ts`
- Create: `shared/schema/area.ts`
- Create: `shared/schema/edge.ts`

- [ ] **Step 1: Write `shared/schema/ids.ts`**

```ts
export type PersonId    = `person:${string}`;
export type GroupId     = `group:${string}`;
export type ProjectId   = `project:${string}`;
export type PaperId     = `paper:${string}`;
export type NewsId      = `news:${string}`;
export type RoomId      = `room:${string}`;
export type AreaId      = `area:${string}`;

export const personId = (nodeId: string): PersonId => `person:${nodeId}`;
export const groupId = (slug: string): GroupId => `group:${slug}`;
export const projectId = (slug: string): ProjectId => `project:${slug}`;
export const paperId = (key: string): PaperId => `paper:${key}`;
export const newsId = (slug: string): NewsId => `news:${slug}`;
export const roomId = (n: string): RoomId => `room:${n}`;
export const areaId = (slug: string): AreaId => `area:${slug}`;
```

- [ ] **Step 2: Write `shared/schema/provenance.ts`**

```ts
export type ProvenanceSource =
  | "csail-directory"
  | "hci-lab-scrape"
  | "semantic-scholar"
  | "csail-news"
  | "manual";

export interface Provenance {
  source: ProvenanceSource;
  sourceUrl?: string;
  fetchedAt: string;
  lastVerifiedAt?: string;
  confidence?: number;
}

export function nowProvenance(source: ProvenanceSource, sourceUrl?: string, confidence?: number): Provenance {
  const now = new Date().toISOString();
  return { source, sourceUrl, fetchedAt: now, lastVerifiedAt: now, confidence };
}
```

- [ ] **Step 3: Write `shared/schema/area.ts`**

```ts
import type { AreaId } from "./ids";

export type AreaKind = "research" | "impact";

export interface Area {
  id: AreaId;
  slug: string;
  name: string;
  kind: AreaKind;
}

export function slugifyArea(name: string): string {
  return name.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

- [ ] **Step 4: Write `shared/schema/edge.ts`**

```ts
import type { Provenance } from "./provenance";

export type EdgeType =
  | "MEMBER_OF" | "PI_OF" | "LOCATED_IN" | "WORKS_ON" | "BELONGS_TO"
  | "AUTHORED" | "MENTIONED_IN" | "WORKS_IN_AREA" | "HAS_IMPACT_ON"
  | "COAUTHORED_WITH";

export interface Edge<F extends string = string, T extends string = string> {
  type: EdgeType;
  from: F;
  to: T;
  props?: Record<string, string | number | boolean>;
  provenance: Provenance;
}
```

- [ ] **Step 5: Type-check**

```bash
bun x tsc --noEmit
```

Expected: passes. (May surface unrelated errors — only block on errors in the new files.)

- [ ] **Step 6: Commit**

```bash
git add shared/schema/ids.ts shared/schema/provenance.ts shared/schema/area.ts shared/schema/edge.ts
git commit -m "schema: foundational types — ids, provenance, area, edge"
```

---

## Task 4: Shared schema — Person, Group, Project

**Files:**
- Create: `shared/schema/person.ts`
- Create: `shared/schema/group.ts`
- Create: `shared/schema/project.ts`

- [ ] **Step 1: Write `shared/schema/person.ts`**

```ts
import type { AreaId, GroupId, PaperId, PersonId, ProjectId, RoomId } from "./ids";
import type { Provenance } from "./provenance";

export type CsailRole =
  | "professor" | "associate-professor" | "assistant-professor"
  | "postdoc" | "research-scientist" | "research-affiliate"
  | "phd-student" | "graduate-student" | "meng-student" | "urop"
  | "visiting-scientist" | "visiting-student" | "visiting-scholar"
  | "admin" | "technical-staff" | "other";

export interface PersonAliases {
  email?: string;
  emailAliases?: string[];
  csailUrlSlug?: string;
  semanticScholarAuthorId?: string;
  dblpId?: string;
  homepage?: string;
}

export interface Person {
  id: PersonId;
  nodeId: string;
  name: string;
  title: string;
  role: CsailRole;
  isPI: boolean;
  isCoreOrDual: boolean;
  affiliation: string;

  aliases: PersonAliases;
  phone?: string;
  photoUrl?: string;
  bio?: string;
  bioRaw?: string;

  groupIds: GroupId[];
  projectIds: ProjectId[];
  paperIds: PaperId[];
  roomIds: RoomId[];
  researchAreaIds: AreaId[];
  impactAreaIds: AreaId[];

  stale: boolean;
  lastUpdatedSource?: string;
  lastUpdatedAt?: string;
  provenance: Provenance;
}
```

- [ ] **Step 2: Write `shared/schema/group.ts`**

```ts
import type { GroupId, PaperId, PersonId, ProjectId, RoomId } from "./ids";
import type { Provenance } from "./provenance";

export type GroupKind = "research-group" | "community-of-research";

export interface Group {
  id: GroupId;
  slug: string;
  name: string;
  shortName?: string;
  kind: GroupKind;
  url?: string;
  teaser?: string;

  piIds: PersonId[];
  memberIds: PersonId[];
  projectIds: ProjectId[];
  roomIds: RoomId[];
  paperIds: PaperId[];

  color?: string;
  provenance: Provenance;
}

export function slugifyGroupUrl(url: string): string {
  const m = url.match(/\/(?:research|group)s?\/([^/?#]+)/) ?? url.match(/\/([^/?#]+)\/?$/);
  return (m?.[1] ?? url).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function classifyGroupKind(rawType: string | null | undefined): GroupKind {
  if (rawType && /community/i.test(rawType)) return "community-of-research";
  return "research-group";
}
```

- [ ] **Step 3: Write `shared/schema/project.ts`**

```ts
import type { GroupId, PersonId, ProjectId } from "./ids";
import type { Provenance } from "./provenance";

export interface Project {
  id: ProjectId;
  slug: string;
  title: string;
  url: string;
  teaser?: string;
  groupIds: GroupId[];
  contributorIds: PersonId[];
  provenance: Provenance;
}

export function slugifyProjectUrl(url: string): string {
  const m = url.match(/\/research\/([^/?#]+)/);
  return (m?.[1] ?? url).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
```

- [ ] **Step 4: Type-check**

```bash
bun x tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add shared/schema/person.ts shared/schema/group.ts shared/schema/project.ts
git commit -m "schema: Person, Group, Project entity types"
```

---

## Task 5: Shared schema — Paper, News, barrel + back-compat shim

**Files:**
- Create: `shared/schema/paper.ts`
- Create: `shared/schema/news.ts`
- Create: `shared/schema/index.ts`
- Modify: `shared/schema/kg.ts`

- [ ] **Step 1: Write `shared/schema/paper.ts`**

```ts
import type { GroupId, PaperId, PersonId } from "./ids";
import type { Provenance } from "./provenance";

export interface Paper {
  id: PaperId;
  semanticScholarId?: string;
  doi?: string;
  arxivId?: string;
  title: string;
  abstract?: string;
  year: number;
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  openAccessPdfUrl?: string;
  authorIds: PersonId[];
  externalAuthorNames: string[];
  groupIds: GroupId[];
  provenance: Provenance;
}
```

- [ ] **Step 2: Write `shared/schema/news.ts`**

```ts
import type { GroupId, NewsId, PersonId, ProjectId } from "./ids";
import type { Provenance } from "./provenance";

export interface NewsItem {
  id: NewsId;
  slug: string;
  title: string;
  publishedAt: string;
  url: string;
  excerpt?: string;
  body?: string;
  personIds: PersonId[];
  groupIds: GroupId[];
  projectIds: ProjectId[];
  imageUrl?: string;
  provenance: Provenance;
}
```

- [ ] **Step 3: Write `shared/schema/index.ts`** (barrel)

```ts
export * from "./ids";
export * from "./provenance";
export * from "./area";
export * from "./edge";
export * from "./person";
export * from "./group";
export * from "./project";
export * from "./paper";
export * from "./news";
export type { Polygon, RoomType, Room } from "./room";
```

- [ ] **Step 4: Replace `shared/schema/kg.ts` with back-compat shim**

The viz currently imports `Person` and `Group` from `@shared/schema/kg`. Keep those names exported, but point them at the new richer types so the viz keeps compiling. The viz only reads `id`, `name`, `groupIds`, `roomIds`, `homepage`, `photoUrl` on Person and `id`, `name`, `shortName`, `roomIds`, `memberIds`, `color`, `url` on Group — all still present in the new types.

```ts
export type { Person } from "./person";
export type { Group } from "./group";
```

- [ ] **Step 5: Verify viz still type-checks**

```bash
cd frontend && bun x tsc --noEmit
```

Expected: no errors related to `@shared/schema/kg`.

- [ ] **Step 6: Commit**

```bash
git add shared/schema/paper.ts shared/schema/news.ts shared/schema/index.ts shared/schema/kg.ts
git commit -m "schema: Paper, News, barrel export, back-compat kg.ts shim"
```

---

## Task 6: Neo4j schema (constraints + indexes)

**Files:**
- Create: `pipeline/kg/schema.cypher`

- [ ] **Step 1: Write `pipeline/kg/schema.cypher`**

```cypher
CREATE CONSTRAINT person_nodeId IF NOT EXISTS
  FOR (p:Person) REQUIRE p.nodeId IS UNIQUE;

CREATE CONSTRAINT group_slug IF NOT EXISTS
  FOR (g:Group) REQUIRE g.slug IS UNIQUE;

CREATE CONSTRAINT project_slug IF NOT EXISTS
  FOR (p:Project) REQUIRE p.slug IS UNIQUE;

CREATE CONSTRAINT paper_id IF NOT EXISTS
  FOR (p:Paper) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT news_slug IF NOT EXISTS
  FOR (n:NewsItem) REQUIRE n.slug IS UNIQUE;

CREATE CONSTRAINT room_id IF NOT EXISTS
  FOR (r:Room) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT area_slug IF NOT EXISTS
  FOR (a:Area) REQUIRE a.slug IS UNIQUE;

CREATE INDEX person_email IF NOT EXISTS FOR (p:Person) ON (p.email);
CREATE INDEX person_isPI IF NOT EXISTS FOR (p:Person) ON (p.isPI);
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
CREATE INDEX paper_year IF NOT EXISTS FOR (p:Paper) ON (p.year);
CREATE INDEX room_floor IF NOT EXISTS FOR (r:Room) ON (r.floor);
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/kg/schema.cypher
git commit -m "kg: Neo4j schema — constraints and indexes"
```

---

## Task 7: Neo4j client wrapper

**Files:**
- Create: `pipeline/kg/client.ts`
- Create: `pipeline/kg/apply-schema.ts`

- [ ] **Step 1: Write `pipeline/kg/client.ts`**

```ts
import neo4j, { type Driver, type Session } from "neo4j-driver";

let driverSingleton: Driver | null = null;

export function getDriver(): Driver {
  if (driverSingleton) return driverSingleton;
  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "csail-dev-password";
  driverSingleton = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
  });
  return driverSingleton;
}

export function readSession(): Session {
  return getDriver().session({ defaultAccessMode: neo4j.session.READ });
}

export function writeSession(): Session {
  return getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
}

export async function closeDriver(): Promise<void> {
  if (driverSingleton) {
    await driverSingleton.close();
    driverSingleton = null;
  }
}

export async function withWrite<T>(fn: (s: Session) => Promise<T>): Promise<T> {
  const s = writeSession();
  try { return await fn(s); } finally { await s.close(); }
}

export async function withRead<T>(fn: (s: Session) => Promise<T>): Promise<T> {
  const s = readSession();
  try { return await fn(s); } finally { await s.close(); }
}
```

- [ ] **Step 2: Write `pipeline/kg/apply-schema.ts`**

```ts
export {};
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { closeDriver, withWrite } from "./client";

const cypherText = readFileSync(join(import.meta.dir, "schema.cypher"), "utf8");
const statements = cypherText
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

await withWrite(async (session) => {
  for (const stmt of statements) {
    await session.run(stmt);
    console.log("✓", stmt.split("\n")[0]);
  }
});
await closeDriver();
console.log(`Applied ${statements.length} schema statements.`);
```

- [ ] **Step 3: Live-test**

```bash
bun pipeline/kg/apply-schema.ts
```

Expected: prints `✓` for each constraint/index, ends with `Applied 12 schema statements.`

- [ ] **Step 4: Verify constraints in DB**

```bash
curl -s -u neo4j:csail-dev-password -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"SHOW CONSTRAINTS YIELD name RETURN count(*) AS n"}]}' \
  http://localhost:7474/db/neo4j/tx/commit | grep -o '"row":\[[0-9]*\]'
```

Expected: `"row":[7]` (7 unique constraints).

- [ ] **Step 5: Commit**

```bash
git add pipeline/kg/client.ts pipeline/kg/apply-schema.ts
git commit -m "kg: neo4j client wrapper + schema applier"
```

---

## Task 8: Pipeline router — add `kg` subcommand

**Files:**
- Modify: `pipeline/build.ts`

- [ ] **Step 1: Replace `pipeline/build.ts` with router that includes `kg`**

```ts
#!/usr/bin/env bun
export {};
const subcommand = process.argv[2];
const args = process.argv.slice(3);

const COMMANDS: Record<string, (args: string[]) => Promise<void>> = {
  inspect: async (args) => {
    const { inspectPdf } = await import("./pdf-trace/inspect");
    const path = args[0] ?? "data/floor-plans.pdf";
    await inspectPdf(path);
  },
  "trace-floor": async (args) => {
    const { extractFloor } = await import("./pdf-trace/extract-vector");
    const floor = parseInt(args[0] ?? "7", 10);
    const pdfPath = args[1] ?? "data/floor-plans.pdf";
    await extractFloor(pdfPath, floor);
  },
  kg: async (args) => {
    const sub = args[0];
    const rest = args.slice(1);
    if (sub === "schema") {
      await import("./kg/apply-schema");
    } else if (sub === "ingest") {
      await import("./kg/ingest/upsert-csail");
      await import("./kg/ingest/upsert-hci-lab");
    } else if (sub === "enrich") {
      const flag = rest[0];
      if (flag === "--floor" && rest[1] === "7") {
        await import("./kg/enrich/semantic-scholar-deep");
      } else {
        await import("./kg/enrich/semantic-scholar");
      }
    } else if (sub === "news") {
      await import("./kg/enrich/csail-news");
    } else if (sub === "snapshot") {
      const action = rest[0] ?? "dump";
      if (action === "dump") await import("./kg/snapshot/dump");
      else if (action === "restore") await import("./kg/snapshot/restore");
      else throw new Error(`Unknown snapshot action: ${action}`);
    } else {
      console.error("Usage: bun pipeline/build.ts kg <schema|ingest|enrich|news|snapshot>");
      console.error("  kg schema                    — apply constraints + indexes");
      console.error("  kg ingest                    — upsert CSAIL + HCI Lab people");
      console.error("  kg enrich [--floor 7]        — Semantic Scholar (deep for floor 7)");
      console.error("  kg news                      — scrape CSAIL news");
      console.error("  kg snapshot [dump|restore]   — neo4j-admin database dump/restore");
      process.exit(1);
    }
  },
};

if (!subcommand || !(subcommand in COMMANDS)) {
  console.error("Usage: bun pipeline/build.ts <inspect|trace-floor|kg> [args]");
  process.exit(1);
}

await COMMANDS[subcommand]!(args);
```

- [ ] **Step 2: Update `package.json` scripts**

Add to `scripts`:
```json
"pipeline:kg:schema": "bun pipeline/build.ts kg schema",
"pipeline:kg:ingest": "bun pipeline/build.ts kg ingest",
"pipeline:kg:enrich": "bun pipeline/build.ts kg enrich",
"pipeline:kg:enrich:floor7": "bun pipeline/build.ts kg enrich --floor 7",
"pipeline:kg:news": "bun pipeline/build.ts kg news",
"pipeline:kg:snapshot": "bun pipeline/build.ts kg snapshot dump",
"pipeline:kg:restore": "bun pipeline/build.ts kg snapshot restore"
```

- [ ] **Step 3: Smoke-test `kg schema` via the router**

```bash
bun pipeline/build.ts kg schema
```

Expected: same output as Task 7 Step 3.

- [ ] **Step 4: Commit**

```bash
git add pipeline/build.ts package.json
git commit -m "kg: build router — kg subcommand for schema/ingest/enrich/news/snapshot"
```

---

## Task 9: Cleaning logic with tests

**Files:**
- Create: `pipeline/kg/ingest/clean-people.ts`
- Create: `pipeline/kg/ingest/clean-people.test.ts`

- [ ] **Step 1: Write `clean-people.test.ts` first**

```ts
import { describe, expect, test } from "bun:test";
import {
  cleanBio,
  parseLastUpdated,
  parseRoom,
  normalizeRole,
  cleanPersonRecord,
  type RawPersonRecord,
} from "./clean-people";

describe("parseLastUpdated", () => {
  test("modern format", () => {
    const r = parseLastUpdated("Last updated Mar 26 '24");
    expect(r.iso?.startsWith("2024-03-26")).toBe(true);
    expect(r.stale).toBe(false);
  });
  test("stale", () => {
    const r = parseLastUpdated("Last updated Nov 19 '21");
    expect(r.stale).toBe(true);
  });
  test("garbage", () => {
    const r = parseLastUpdated("");
    expect(r.iso).toBeUndefined();
    expect(r.stale).toBe(false);
  });
});

describe("parseRoom", () => {
  test("G-wing 7th floor", () => {
    expect(parseRoom("32-G742")).toEqual({ id: "room:32-G742", floor: 7, wing: "G" });
  });
  test("D-wing 4th floor", () => {
    expect(parseRoom("32-D472")).toEqual({ id: "room:32-D472", floor: 4, wing: "D" });
  });
  test("no wing", () => {
    expect(parseRoom("32-376")).toEqual({ id: "room:32-376", floor: 3, wing: null });
  });
  test("non-Stata", () => {
    expect(parseRoom("46-203")).toBeNull();
  });
  test("null/empty", () => {
    expect(parseRoom(null)).toBeNull();
    expect(parseRoom("")).toBeNull();
  });
});

describe("normalizeRole", () => {
  test.each([
    ["Professor", "professor"],
    ["Associate Professor", "associate-professor"],
    ["Assistant Professor", "assistant-professor"],
    ["Graduate Student", "graduate-student"],
    ["PhD Student", "phd-student"],
    ["MEng Student", "meng-student"],
    ["UROP", "urop"],
    ["Postdoctoral Associate", "postdoc"],
    ["Postdoctoral Fellow", "postdoc"],
    ["Research Scientist", "research-scientist"],
    ["Research Affiliate", "research-affiliate"],
    ["Visiting Scientist", "visiting-scientist"],
    ["Administrative Assistant II", "admin"],
    ["Technical Associate 1", "technical-staff"],
    ["Some Made-Up Title", "other"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeRole(input)).toBe(expected);
  });
});

describe("cleanBio", () => {
  test("collapses mid-sentence newlines", () => {
    const raw = "She is also head of the\nComputation and Biology\ngroup.";
    expect(cleanBio(raw)).toBe("She is also head of the Computation and Biology group.");
  });
  test("preserves paragraph breaks", () => {
    const raw = "First paragraph.\n\nSecond paragraph.";
    expect(cleanBio(raw)).toBe("First paragraph.\n\nSecond paragraph.");
  });
});

describe("cleanPersonRecord", () => {
  const raw: RawPersonRecord = {
    url: "https://www.csail.mit.edu/person/foo-bar",
    node_id: "9999",
    name: "Foo Bar",
    role_tag: "PI",
    role_category: "Core/Dual",
    title: "Professor",
    email: "foo@csail.mit.edu",
    phone: "253-1234",
    room: "32-G742",
    room_map_url: null,
    photo_url: null,
    bio: "Hello\nworld.",
    website: "http://example.com",
    research_areas: ["AI & ML", "AI & ML", "Robotics"],
    impact_areas: ["Big Data"],
    last_updated: "Last updated Mar 16 '26",
    projects: [],
    groups: [{ type: "Research Group", title: "Foo Group", url: "https://www.csail.mit.edu/research/foo", teaser: "Foo." }],
  };
  const cleaned = cleanPersonRecord(raw);
  test("id and nodeId", () => {
    expect(cleaned.person.id).toBe("person:9999");
    expect(cleaned.person.nodeId).toBe("9999");
  });
  test("isPI flag", () => {
    expect(cleaned.person.isPI).toBe(true);
    expect(cleaned.person.isCoreOrDual).toBe(true);
  });
  test("dedupes research areas", () => {
    expect(cleaned.person.researchAreaIds).toEqual(["area:ai-and-ml", "area:robotics"]);
  });
  test("emits room with floor parsed", () => {
    expect(cleaned.rooms[0]?.floor).toBe(7);
  });
  test("emits group", () => {
    expect(cleaned.groups[0]?.kind).toBe("research-group");
    expect(cleaned.groups[0]?.slug).toBe("foo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (file doesn't exist yet)**

```bash
bun test pipeline/kg/ingest/clean-people.test.ts 2>&1 | head -5
```

Expected: import error.

- [ ] **Step 3: Write `pipeline/kg/ingest/clean-people.ts`**

```ts
import { readFileSync } from "node:fs";
import type {
  Area, AreaId, CsailRole, Group, GroupKind, Person,
  Project, RoomId,
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

export interface CleanedRoomFK { id: RoomId; number: string; floor: number; wing: string | null; }

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
  if (TITLE_MAP[lower]) return TITLE_MAP[lower];
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
  const stale = ageMs > 1000 * 60 * 60 * 24 * 30 * 24;
  return { iso, stale };
}

export function parseRoom(raw: string | null | undefined): { id: RoomId; floor: number; wing: string | null } | null {
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

  const researchAreaIds: AreaId[] = [];
  const researchAreas: Area[] = [];
  const seenRA = new Set<string>();
  for (const a of raw.research_areas ?? []) {
    const slug = slugifyArea(a);
    if (seenRA.has(slug)) continue;
    seenRA.add(slug);
    researchAreaIds.push(areaId(slug));
    researchAreas.push({ id: areaId(slug), slug, name: a, kind: "research" });
  }

  const impactAreaIds: AreaId[] = [];
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test pipeline/kg/ingest/clean-people.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/kg/ingest/clean-people.ts pipeline/kg/ingest/clean-people.test.ts
git commit -m "kg: clean-people — normalize raw scrape into typed entities (with tests)"
```

---

## Task 10: CSAIL bulk upsert

**Files:**
- Create: `pipeline/kg/ingest/upsert-csail.ts`

- [ ] **Step 1: Write `pipeline/kg/ingest/upsert-csail.ts`**

```ts
export {};
import { closeDriver, withWrite } from "../client";
import { cleanPersonRecord, readJsonlSync } from "./clean-people";

const PEOPLE_PATH = "data/people.jsonl";

const records = readJsonlSync(PEOPLE_PATH);
console.log(`Read ${records.length} raw records from ${PEOPLE_PATH}`);

let personCount = 0, groupCount = 0, projectCount = 0, roomCount = 0, areaCount = 0;
const groupSlugSeen = new Set<string>(), projectSlugSeen = new Set<string>(),
      roomIdSeen = new Set<string>(), areaSlugSeen = new Set<string>();

await withWrite(async (session) => {
  for (let i = 0; i < records.length; i++) {
    const raw = records[i]!;
    const cleaned = cleanPersonRecord(raw);
    const p = cleaned.person;

    const personProps = {
      nodeId: p.nodeId,
      id: p.id,
      name: p.name,
      title: p.title,
      role: p.role,
      isPI: p.isPI,
      isCoreOrDual: p.isCoreOrDual,
      affiliation: p.affiliation,
      email: p.aliases.email ?? null,
      homepage: p.aliases.homepage ?? null,
      csailUrlSlug: p.aliases.csailUrlSlug ?? null,
      phone: p.phone ?? null,
      photoUrl: p.photoUrl ?? null,
      bio: p.bio ?? null,
      bioRaw: p.bioRaw ?? null,
      stale: p.stale,
      lastUpdatedSource: p.lastUpdatedSource ?? null,
      lastUpdatedAt: p.lastUpdatedAt ?? null,
      sourceUrl: p.provenance.sourceUrl ?? null,
      fetchedAt: p.provenance.fetchedAt,
    };

    await session.run(
      `MERGE (p:Person {nodeId: $nodeId}) SET p += $props`,
      { nodeId: p.nodeId, props: personProps }
    );
    personCount++;

    for (const g of cleaned.groups) {
      const label = g.kind === "research-group" ? "ResearchGroup" : "CommunityOfResearch";
      await session.run(
        `MERGE (g:Group {slug: $slug})
         ON CREATE SET g.id = $id, g.name = $name, g.kind = $kind, g.url = $url, g.teaser = $teaser
         SET g.name = $name
         WITH g CALL apoc.create.addLabels(g, [$label]) YIELD node RETURN node`,
        { slug: g.slug, id: g.id, name: g.name, kind: g.kind, url: g.url ?? null, teaser: g.teaser ?? null, label }
      );
      await session.run(
        `MATCH (p:Person {nodeId: $nodeId}), (g:Group {slug: $slug})
         MERGE (p)-[r:MEMBER_OF]->(g)
         SET r.source = "csail-directory", r.fetchedAt = $now`,
        { nodeId: p.nodeId, slug: g.slug, now: p.provenance.fetchedAt }
      );
      if (p.isPI) {
        await session.run(
          `MATCH (p:Person {nodeId: $nodeId}), (g:Group {slug: $slug})
           MERGE (p)-[r:PI_OF]->(g)
           SET r.source = "csail-directory", r.fetchedAt = $now`,
          { nodeId: p.nodeId, slug: g.slug, now: p.provenance.fetchedAt }
        );
      }
      if (!groupSlugSeen.has(g.slug)) { groupSlugSeen.add(g.slug); groupCount++; }
    }

    for (const proj of cleaned.projects) {
      await session.run(
        `MERGE (pr:Project {slug: $slug})
         ON CREATE SET pr.id = $id, pr.title = $title, pr.url = $url, pr.teaser = $teaser
         SET pr.title = $title`,
        { slug: proj.slug, id: proj.id, title: proj.title, url: proj.url, teaser: proj.teaser ?? null }
      );
      await session.run(
        `MATCH (p:Person {nodeId: $nodeId}), (pr:Project {slug: $slug})
         MERGE (p)-[r:WORKS_ON]->(pr)
         SET r.source = "csail-directory", r.fetchedAt = $now`,
        { nodeId: p.nodeId, slug: proj.slug, now: p.provenance.fetchedAt }
      );
      if (!projectSlugSeen.has(proj.slug)) { projectSlugSeen.add(proj.slug); projectCount++; }
    }

    for (const room of cleaned.rooms) {
      await session.run(
        `MERGE (r:Room {id: $id})
         ON CREATE SET r.number = $number, r.floor = $floor, r.wing = $wing
         SET r.floor = $floor, r.wing = $wing`,
        { id: room.id, number: room.number, floor: room.floor, wing: room.wing }
      );
      await session.run(
        `MATCH (p:Person {nodeId: $nodeId}), (r:Room {id: $id})
         MERGE (p)-[rel:LOCATED_IN]->(r)
         SET rel.source = "csail-directory", rel.fetchedAt = $now`,
        { nodeId: p.nodeId, id: room.id, now: p.provenance.fetchedAt }
      );
      if (!roomIdSeen.has(room.id)) { roomIdSeen.add(room.id); roomCount++; }
    }

    for (const a of cleaned.researchAreas) {
      await session.run(
        `MERGE (a:Area {slug: $slug}) SET a.id = $id, a.name = $name, a.kind = $kind`,
        { slug: a.slug, id: a.id, name: a.name, kind: a.kind }
      );
      await session.run(
        `MATCH (p:Person {nodeId: $nodeId}), (a:Area {slug: $slug})
         MERGE (p)-[r:WORKS_IN_AREA]->(a)
         SET r.source = "csail-directory", r.fetchedAt = $now`,
        { nodeId: p.nodeId, slug: a.slug, now: p.provenance.fetchedAt }
      );
      if (!areaSlugSeen.has(a.slug)) { areaSlugSeen.add(a.slug); areaCount++; }
    }

    for (const a of cleaned.impactAreas) {
      await session.run(
        `MERGE (a:Area {slug: $slug}) SET a.id = $id, a.name = $name, a.kind = $kind`,
        { slug: a.slug, id: a.id, name: a.name, kind: a.kind }
      );
      await session.run(
        `MATCH (p:Person {nodeId: $nodeId}), (a:Area {slug: $slug})
         MERGE (p)-[r:HAS_IMPACT_ON]->(a)
         SET r.source = "csail-directory", r.fetchedAt = $now`,
        { nodeId: p.nodeId, slug: a.slug, now: p.provenance.fetchedAt }
      );
      if (!areaSlugSeen.has(a.slug)) { areaSlugSeen.add(a.slug); areaCount++; }
    }

    if (i % 100 === 0) console.log(`  upserted ${i + 1}/${records.length}`);
  }
});
await closeDriver();
console.log(`\nDone. People: ${personCount}, Groups: ${groupCount}, Projects: ${projectCount}, Rooms: ${roomCount}, Areas: ${areaCount}`);
```

- [ ] **Step 2: Live-test**

```bash
bun pipeline/build.ts kg ingest 2>&1 | tail -20
```

Expected: ends with `Done. People: 1493, Groups: ~70, Projects: ~300, Rooms: ~184, Areas: ~20`.

- [ ] **Step 3: Verify with a quick Cypher count**

```bash
curl -s -u neo4j:csail-dev-password -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (p:Person) RETURN count(p) AS people"}]}' \
  http://localhost:7474/db/neo4j/tx/commit
```

Expected: `"row":[1493]`.

- [ ] **Step 4: Verify Floor 7 query works**

```bash
curl -s -u neo4j:csail-dev-password -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (p:Person)-[:LOCATED_IN]->(r:Room) WHERE r.floor = 7 RETURN count(p) AS n"}]}' \
  http://localhost:7474/db/neo4j/tx/commit
```

Expected: `"row":[47]`.

- [ ] **Step 5: Re-run ingest to verify idempotency**

```bash
bun pipeline/build.ts kg ingest 2>&1 | tail -3
```

Expected: same final counts as Step 2 (no duplicates introduced).

- [ ] **Step 6: Commit**

```bash
git add pipeline/kg/ingest/upsert-csail.ts
git commit -m "kg: upsert-csail — bulk MERGE 1,493 people + groups/projects/rooms/areas"
```

---

## Task 11: HCI Lab upsert (matched to CSAIL persons)

**Files:**
- Create: `pipeline/kg/ingest/upsert-hci-lab.ts`

The HCI Lab data lives in `data/groups.json` with members keyed by name-slug (e.g., `daniel-jackson`). To merge cleanly with CSAIL data keyed by `nodeId`, do name matching.

- [ ] **Step 1: Write `pipeline/kg/ingest/upsert-hci-lab.ts`**

```ts
export {};
import { readFileSync } from "node:fs";
import { closeDriver, withWrite } from "../client";
import { groupId, nowProvenance } from "../../../shared/schema";

interface RawGroupSeed {
  id: string;
  name: string;
  shortName?: string;
  url?: string;
  roomIds: string[];
  memberIds: string[];
  color?: string;
}

const groups: RawGroupSeed[] = JSON.parse(readFileSync("data/groups.json", "utf8"));
const hci = groups.find((g) => g.id === "hci-lab");
if (!hci) { console.error("hci-lab missing from data/groups.json"); process.exit(1); }

function nameFromSlug(slug: string): string {
  return slug.split("-").map((s) => s.length <= 2 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

const provenance = nowProvenance("hci-lab-scrape", hci!.url, 0.85);
const matched: string[] = []; const unmatched: string[] = [];

await withWrite(async (session) => {
  // Upsert HCI Lab as a research group with the canonical slug
  await session.run(
    `MERGE (g:Group {slug: $slug})
     ON CREATE SET g.id = $id, g.name = $name, g.shortName = $shortName, g.kind = "research-group", g.url = $url, g.color = $color
     SET g.shortName = $shortName, g.color = $color
     WITH g CALL apoc.create.addLabels(g, ["ResearchGroup"]) YIELD node RETURN node`,
    {
      slug: "hci-lab",
      id: groupId("hci-lab"),
      name: hci!.name,
      shortName: hci!.shortName ?? null,
      url: hci!.url ?? null,
      color: hci!.color ?? null,
    }
  );

  // Attach HCI Lab to its rooms
  for (const rid of hci!.roomIds) {
    await session.run(
      `MERGE (r:Room {id: $rid}) ON CREATE SET r.number = $number, r.floor = $floor, r.wing = $wing
       WITH r MATCH (g:Group {slug: "hci-lab"}) MERGE (g)-[rel:LOCATED_IN]->(r)
       SET rel.source = "hci-lab-scrape", rel.fetchedAt = $now`,
      {
        rid: `room:${rid}`,
        number: rid,
        floor: parseInt(rid.match(/^32-[A-Z]?(\d)/)?.[1] ?? "7", 10),
        wing: rid.match(/^32-([A-Z])/)?.[1] ?? null,
        now: provenance.fetchedAt,
      }
    );
  }

  // Match each memberId (slug) to a CSAIL Person by name
  for (const memberSlug of hci!.memberIds) {
    const guessName = nameFromSlug(memberSlug);
    const result = await session.run(
      `MATCH (p:Person)
       WHERE toLower(p.name) = toLower($name)
          OR toLower(replace(p.name, '.', '')) = toLower($name)
          OR all(part IN split(toLower($name), ' ') WHERE toLower(p.name) CONTAINS part)
       RETURN p.nodeId AS nodeId, p.name AS name LIMIT 1`,
      { name: guessName }
    );
    const rec = result.records[0];
    if (rec) {
      const nodeId = rec.get("nodeId");
      await session.run(
        `MATCH (p:Person {nodeId: $nodeId}), (g:Group {slug: "hci-lab"})
         MERGE (p)-[r:MEMBER_OF]->(g)
         SET r.source = "hci-lab-scrape", r.fetchedAt = $now`,
        { nodeId, now: provenance.fetchedAt }
      );
      matched.push(`${memberSlug} → ${rec.get("name")}`);
    } else {
      unmatched.push(memberSlug);
    }
  }
});
await closeDriver();
console.log(`HCI Lab: ${matched.length} matched, ${unmatched.length} unmatched`);
if (unmatched.length) console.log("Unmatched:", unmatched.join(", "));
```

- [ ] **Step 2: Live-test (already runs as part of `kg ingest`)**

```bash
bun pipeline/build.ts kg ingest 2>&1 | tail -5
```

Expected: ends with `HCI Lab: N matched, M unmatched`.

- [ ] **Step 3: Verify HCI members linked**

```bash
curl -s -u neo4j:csail-dev-password -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (p:Person)-[:MEMBER_OF]->(g:Group {slug:\"hci-lab\"}) RETURN count(p) AS n"}]}' \
  http://localhost:7474/db/neo4j/tx/commit
```

Expected: `"row":[N]` where N ≥ 20 (some HCI members aren't in CSAIL directory).

- [ ] **Step 4: Commit**

```bash
git add pipeline/kg/ingest/upsert-hci-lab.ts
git commit -m "kg: upsert-hci-lab — link HCI Lab seed to CSAIL persons by name match"
```

---

## Task 12: Semantic Scholar enrichment (general, capped)

**Files:**
- Create: `pipeline/kg/enrich/semantic-scholar.ts`
- Create: `pipeline/kg/enrich/s2-client.ts`

- [ ] **Step 1: Write `pipeline/kg/enrich/s2-client.ts`** (shared throttle + types)

```ts
export {};

const S2_BASE = "https://api.semanticscholar.org/graph/v1";
const API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;
let lastReqAt = 0;
const MIN_INTERVAL_MS = API_KEY ? 100 : 1100;

async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastReqAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReqAt = Date.now();
}

export interface S2Author { authorId: string; name: string; affiliations?: string[]; paperCount?: number; }
export interface S2Paper {
  paperId: string;
  externalIds?: { DOI?: string; ArXiv?: string };
  title: string;
  abstract?: string;
  year?: number;
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  openAccessPdf?: { url: string };
  authors?: { authorId: string | null; name: string }[];
}

export async function s2Get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  await throttle();
  const url = new URL(`${S2_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  const resp = await fetch(url, { headers });
  if (resp.status === 429) {
    await new Promise((r) => setTimeout(r, 5000));
    return s2Get<T>(path, params);
  }
  if (!resp.ok) throw new Error(`S2 ${resp.status} ${resp.statusText}: ${url}`);
  return await resp.json() as T;
}

export async function searchAuthors(name: string): Promise<S2Author[]> {
  const data = await s2Get<{ data: S2Author[] }>("/author/search", {
    query: name, limit: 10, fields: "authorId,name,affiliations,paperCount",
  });
  return data.data ?? [];
}

export async function authorPapers(authorId: string, limit: number, offset = 0): Promise<S2Paper[]> {
  const fields = "paperId,externalIds,title,abstract,year,venue,citationCount,influentialCitationCount,openAccessPdf,authors";
  const data = await s2Get<{ data: S2Paper[] }>(`/author/${authorId}/papers`, { fields, limit, offset });
  return data.data ?? [];
}

const MIT_REGEX = /\b(MIT|Massachusetts Institute of Technology|CSAIL)\b/i;
export function isMITAffiliated(a: S2Author): boolean {
  return (a.affiliations ?? []).some((s) => MIT_REGEX.test(s));
}
```

- [ ] **Step 2: Write `pipeline/kg/enrich/semantic-scholar.ts`**

```ts
export {};
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { closeDriver, withRead, withWrite } from "../client";
import { paperId } from "../../../shared/schema";
import { authorPapers, isMITAffiliated, searchAuthors, type S2Paper } from "./s2-client";

const PROGRESS_PATH = "data/s2-progress.jsonl";
const FLAGS_PATH = "data/disambiguation-flags.jsonl";
const PAPER_CAP = 20;

const completed = new Set<string>();
if (existsSync(PROGRESS_PATH)) {
  for (const line of readFileSync(PROGRESS_PATH, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { completed.add((JSON.parse(line) as { nodeId: string }).nodeId); } catch {}
  }
}

interface PersonRow { nodeId: string; name: string; researchAreas: string[]; }

const people: PersonRow[] = await withRead(async (s) => {
  const r = await s.run(
    `MATCH (p:Person)
     OPTIONAL MATCH (p)-[:WORKS_IN_AREA]->(a:Area {kind:"research"})
     RETURN p.nodeId AS nodeId, p.name AS name, collect(DISTINCT a.name) AS areas`
  );
  return r.records.map((rec) => ({
    nodeId: rec.get("nodeId") as string,
    name: rec.get("name") as string,
    researchAreas: (rec.get("areas") as string[]) ?? [],
  }));
});

console.log(`S2 enrich: ${people.length} people, skipping ${completed.size} already done.`);

let upserted = 0;
for (const person of people) {
  if (completed.has(person.nodeId)) continue;
  try {
    const candidates = await searchAuthors(person.name);
    const mit = candidates.filter(isMITAffiliated);
    const chosen = mit[0] ?? candidates[0];
    if (!chosen) {
      appendFileSync(FLAGS_PATH, JSON.stringify({ nodeId: person.nodeId, name: person.name, reason: "no-s2-author" }) + "\n");
      appendFileSync(PROGRESS_PATH, JSON.stringify({ nodeId: person.nodeId, status: "no-author" }) + "\n");
      continue;
    }
    const confidence = isMITAffiliated(chosen) ? 0.9 : 0.4;
    if (confidence < 0.5) {
      appendFileSync(FLAGS_PATH, JSON.stringify({ nodeId: person.nodeId, name: person.name, chosenAuthorId: chosen.authorId, chosenName: chosen.name, confidence }) + "\n");
    }
    const papers = await authorPapers(chosen.authorId, PAPER_CAP);
    await upsertPapers(person.nodeId, chosen.authorId, papers, confidence);
    upserted += papers.length;
    appendFileSync(PROGRESS_PATH, JSON.stringify({ nodeId: person.nodeId, authorId: chosen.authorId, count: papers.length }) + "\n");
    if (upserted % 50 === 0) console.log(`  upserted ${upserted} papers so far`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ${person.name} (${person.nodeId}): ${msg}`);
    appendFileSync(PROGRESS_PATH, JSON.stringify({ nodeId: person.nodeId, error: msg }) + "\n");
  }
}
await closeDriver();
console.log(`Done. ${upserted} paper-author edges added.`);

async function upsertPapers(nodeId: string, authorId: string, papers: S2Paper[], confidence: number) {
  await withWrite(async (s) => {
    await s.run(`MATCH (p:Person {nodeId: $nodeId}) SET p.semanticScholarAuthorId = $authorId`, { nodeId, authorId });
    for (const paper of papers) {
      const pid = paperId(`s2:${paper.paperId}`);
      const externalAuthorNames = (paper.authors ?? []).map((a) => a.name);
      await s.run(
        `MERGE (pp:Paper {id: $id})
         ON CREATE SET pp.semanticScholarId = $s2id, pp.title = $title, pp.year = $year, pp.venue = $venue,
                       pp.abstract = $abstract, pp.citationCount = $cc, pp.influentialCitationCount = $icc,
                       pp.doi = $doi, pp.arxivId = $arxiv, pp.openAccessPdfUrl = $pdf,
                       pp.externalAuthorNames = $externalAuthorNames
         SET pp.title = $title, pp.year = $year, pp.venue = $venue, pp.citationCount = $cc, pp.influentialCitationCount = $icc`,
        {
          id: pid,
          s2id: paper.paperId,
          title: paper.title,
          year: paper.year ?? 0,
          venue: paper.venue ?? null,
          abstract: paper.abstract ?? null,
          cc: paper.citationCount ?? 0,
          icc: paper.influentialCitationCount ?? 0,
          doi: paper.externalIds?.DOI ?? null,
          arxiv: paper.externalIds?.ArXiv ?? null,
          pdf: paper.openAccessPdf?.url ?? null,
          externalAuthorNames,
        }
      );
      await s.run(
        `MATCH (p:Person {nodeId: $nodeId}), (pp:Paper {id: $id})
         MERGE (p)-[r:AUTHORED]->(pp)
         SET r.source = "semantic-scholar", r.confidence = $confidence, r.fetchedAt = $now`,
        { nodeId, id: pid, confidence, now: new Date().toISOString() }
      );
    }
  });
}
```

- [ ] **Step 3: Skip the live test for the general path** (it would take ~30 min with rate limit). The deep version (Task 13) is the demo-critical one and will exercise the same code path.

- [ ] **Step 4: Commit**

```bash
git add pipeline/kg/enrich/s2-client.ts pipeline/kg/enrich/semantic-scholar.ts
git commit -m "kg: Semantic Scholar enrichment — capped at 20 papers/person, resumable"
```

---

## Task 13: Floor 7 deep enrichment

**Files:**
- Create: `pipeline/kg/enrich/semantic-scholar-deep.ts`

- [ ] **Step 1: Write `pipeline/kg/enrich/semantic-scholar-deep.ts`**

```ts
export {};
import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { closeDriver, withRead, withWrite } from "../client";
import { paperId } from "../../../shared/schema";
import { authorPapers, isMITAffiliated, searchAuthors, type S2Paper } from "./s2-client";

const CANDIDATES_PATH = "data/floor-7-author-candidates.jsonl";
const OVERRIDES_PATH = "data/floor-7-author-overrides.json";

interface Override { nodeId: string; authorId: string; }
const overrides: Record<string, string> = {};
if (existsSync(OVERRIDES_PATH)) {
  for (const o of JSON.parse(readFileSync(OVERRIDES_PATH, "utf8")) as Override[]) {
    overrides[o.nodeId] = o.authorId;
  }
}

interface Floor7Person { nodeId: string; name: string; }
const cohort: Floor7Person[] = await withRead(async (s) => {
  const r = await s.run(
    `MATCH (p:Person)-[:LOCATED_IN]->(r:Room) WHERE r.floor = 7
     RETURN DISTINCT p.nodeId AS nodeId, p.name AS name
     UNION
     MATCH (p:Person)-[:MEMBER_OF]->(g:Group {slug:"hci-lab"})
     RETURN DISTINCT p.nodeId AS nodeId, p.name AS name`
  );
  return r.records.map((rec) => ({ nodeId: rec.get("nodeId") as string, name: rec.get("name") as string }));
});
console.log(`Floor 7 cohort: ${cohort.length} people`);

writeFileSync(CANDIDATES_PATH, "");
let totalPapers = 0;

for (const person of cohort) {
  try {
    let authorId = overrides[person.nodeId];
    if (!authorId) {
      const candidates = await searchAuthors(person.name);
      const mit = candidates.filter(isMITAffiliated);
      const chosen = mit[0] ?? candidates[0];
      if (!chosen) {
        appendFileSync(CANDIDATES_PATH, JSON.stringify({ nodeId: person.nodeId, name: person.name, candidates: [] }) + "\n");
        continue;
      }
      authorId = chosen.authorId;
      appendFileSync(CANDIDATES_PATH, JSON.stringify({
        nodeId: person.nodeId, name: person.name,
        candidates: candidates.slice(0, 3).map((c) => ({ id: c.authorId, name: c.name, affiliations: c.affiliations, paperCount: c.paperCount })),
        chosen: chosen.authorId, chosenIsMIT: isMITAffiliated(chosen),
      }) + "\n");
    }

    let offset = 0; const all: S2Paper[] = [];
    while (true) {
      const batch = await authorPapers(authorId, 100, offset);
      all.push(...batch);
      if (batch.length < 100) break;
      offset += 100;
      if (offset > 1000) break;
    }
    await upsertPapersDeep(person.nodeId, authorId, all);
    totalPapers += all.length;
    console.log(`  ${person.name}: ${all.length} papers`);
  } catch (e) {
    console.error(`  ${person.name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log(`\nWriting COAUTHORED_WITH edges within Floor 7 cohort...`);
const coauthorEdges = await withWrite(async (s) => {
  const r = await s.run(
    `MATCH (a:Person)-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(b:Person)
     WHERE a.nodeId < b.nodeId AND a.nodeId IN $cohort AND b.nodeId IN $cohort
     WITH a, b, count(p) AS pc, min(p.year) AS firstYear, max(p.year) AS lastYear
     MERGE (a)-[r:COAUTHORED_WITH]->(b)
     SET r.paperCount = pc, r.firstYear = firstYear, r.lastYear = lastYear,
         r.source = "semantic-scholar", r.fetchedAt = $now
     RETURN count(r) AS edges`,
    { cohort: cohort.map((p) => p.nodeId), now: new Date().toISOString() }
  );
  return (r.records[0]!.get("edges") as { toNumber(): number }).toNumber();
});
await closeDriver();
console.log(`Done. ${cohort.length} people, ${totalPapers} papers, ${coauthorEdges} coauthor edges.`);

async function upsertPapersDeep(nodeId: string, authorId: string, papers: S2Paper[]) {
  await withWrite(async (s) => {
    await s.run(`MATCH (p:Person {nodeId: $nodeId}) SET p.semanticScholarAuthorId = $authorId`, { nodeId, authorId });
    for (const paper of papers) {
      const pid = paperId(`s2:${paper.paperId}`);
      const externalAuthorNames = (paper.authors ?? []).map((a) => a.name);
      await s.run(
        `MERGE (pp:Paper {id: $id})
         ON CREATE SET pp.semanticScholarId = $s2id, pp.title = $title, pp.year = $year, pp.venue = $venue,
                       pp.abstract = $abstract, pp.citationCount = $cc, pp.influentialCitationCount = $icc,
                       pp.doi = $doi, pp.arxivId = $arxiv, pp.openAccessPdfUrl = $pdf,
                       pp.externalAuthorNames = $externalAuthorNames
         SET pp.title = $title, pp.year = $year, pp.venue = $venue, pp.citationCount = $cc, pp.influentialCitationCount = $icc`,
        {
          id: pid, s2id: paper.paperId, title: paper.title,
          year: paper.year ?? 0, venue: paper.venue ?? null, abstract: paper.abstract ?? null,
          cc: paper.citationCount ?? 0, icc: paper.influentialCitationCount ?? 0,
          doi: paper.externalIds?.DOI ?? null, arxiv: paper.externalIds?.ArXiv ?? null,
          pdf: paper.openAccessPdf?.url ?? null, externalAuthorNames,
        }
      );
      await s.run(
        `MATCH (p:Person {nodeId: $nodeId}), (pp:Paper {id: $id})
         MERGE (p)-[r:AUTHORED]->(pp)
         SET r.source = "semantic-scholar", r.confidence = 1.0, r.fetchedAt = $now`,
        { nodeId, id: pid, now: new Date().toISOString() }
      );
    }
  });
}
```

- [ ] **Step 2: Live-test (this is the demo-critical run)**

```bash
bun pipeline/build.ts kg enrich --floor 7 2>&1 | tail -10
```

Expected: `~50` people processed, `≥500` papers, `≥30` COAUTHORED_WITH edges. Run will take ~3–10 min depending on S2 latency.

- [ ] **Step 3: Verify counts**

```bash
curl -s -u neo4j:csail-dev-password -H "Content-Type: application/json" \
  -d '{"statements":[
    {"statement":"MATCH (p:Paper) RETURN count(p) AS papers"},
    {"statement":"MATCH ()-[r:COAUTHORED_WITH]->() RETURN count(r) AS coauth"}
  ]}' http://localhost:7474/db/neo4j/tx/commit
```

Expected: papers ≥ 500, coauth ≥ 30.

- [ ] **Step 4: Commit**

```bash
git add pipeline/kg/enrich/semantic-scholar-deep.ts data/floor-7-author-candidates.jsonl
git commit -m "kg: Floor 7 deep S2 enrichment — uncapped papers + intra-cohort coauthor edges"
```

(If `floor-7-author-candidates.jsonl` is gitignored, drop it from the add list.)

---

## Task 14: CSAIL news scraper

**Files:**
- Create: `pipeline/kg/enrich/csail-news.ts`

- [ ] **Step 1: Write `pipeline/kg/enrich/csail-news.ts`**

```ts
export {};
import { load } from "cheerio";
import { appendFileSync } from "node:fs";
import { closeDriver, withRead, withWrite } from "../client";
import { newsId } from "../../../shared/schema";

const ORPHANS_PATH = "data/news-orphans.jsonl";
const MAX_AGE_YEARS = 3;
const MAX_PAGES = 30;
const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - MAX_AGE_YEARS);

interface KnownPersons { bySlug: Map<string, string>; byNodeId: Map<string, string>; }
const known: KnownPersons = await withRead(async (s) => {
  const r = await s.run(`MATCH (p:Person) RETURN p.nodeId AS nodeId, p.csailUrlSlug AS slug, p.name AS name`);
  const bySlug = new Map<string, string>(), byNodeId = new Map<string, string>();
  for (const rec of r.records) {
    const nodeId = rec.get("nodeId") as string;
    const slug = rec.get("slug") as string | null;
    if (slug) bySlug.set(slug, nodeId);
    byNodeId.set(nodeId, rec.get("name") as string);
  }
  return { bySlug, byNodeId };
});
const knownGroups: Set<string> = await withRead(async (s) => {
  const r = await s.run(`MATCH (g:Group) RETURN g.slug AS slug`);
  return new Set(r.records.map((rec) => rec.get("slug") as string));
});

let articleCount = 0, mentionCount = 0;
for (let page = 0; page < MAX_PAGES; page++) {
  const listUrl = `https://www.csail.mit.edu/news?page=${page}`;
  console.log(`page ${page}: ${listUrl}`);
  const listResp = await fetch(listUrl);
  if (!listResp.ok) { console.log(`  HTTP ${listResp.status}, stopping`); break; }
  const $ = load(await listResp.text());
  const links = $('a[href^="/news/"]').map((_, el) => $(el).attr("href")).get()
    .filter((h, i, a) => h && a.indexOf(h) === i) as string[];
  if (links.length === 0) break;

  let stopPaging = false;
  for (const href of links) {
    const fullUrl = `https://www.csail.mit.edu${href}`;
    try {
      const r = await fetch(fullUrl);
      if (!r.ok) continue;
      const $$ = load(await r.text());
      const title = $$("h1").first().text().trim();
      const dateText = $$("time").first().attr("datetime") ?? $$("time").first().text().trim();
      const publishedAt = parseDateMaybe(dateText);
      if (publishedAt && new Date(publishedAt) < cutoff) { stopPaging = true; continue; }

      const slug = href.replace(/^\/news\//, "").replace(/\/$/, "");
      const nid = newsId(`csail:${slug}`);
      const body = $$("article").text().replace(/\s+/g, " ").trim().slice(0, 5000);
      const excerpt = body.slice(0, 300);

      const personIds = new Set<string>();
      const groupIds = new Set<string>();
      $$('a[href^="/person/"]').each((_, el) => {
        const personSlug = ($$(el).attr("href") ?? "").replace(/^\/person\//, "").replace(/\/$/, "");
        const nodeId = known.bySlug.get(personSlug);
        if (nodeId) personIds.add(nodeId);
        else appendFileSync(ORPHANS_PATH, JSON.stringify({ news: slug, kind: "person", slug: personSlug }) + "\n");
      });
      $$('a[href^="/research/"]').each((_, el) => {
        const groupSlug = ($$(el).attr("href") ?? "").replace(/^\/research\//, "").replace(/\/$/, "");
        if (knownGroups.has(groupSlug)) groupIds.add(groupSlug);
        else appendFileSync(ORPHANS_PATH, JSON.stringify({ news: slug, kind: "group", slug: groupSlug }) + "\n");
      });

      await withWrite(async (s) => {
        await s.run(
          `MERGE (n:NewsItem {slug: $slug})
           ON CREATE SET n.id = $id, n.title = $title, n.publishedAt = $publishedAt, n.url = $url,
                         n.excerpt = $excerpt, n.body = $body
           SET n.title = $title, n.excerpt = $excerpt, n.body = $body`,
          { slug, id: nid, title, publishedAt: publishedAt ?? null, url: fullUrl, excerpt, body }
        );
        for (const nodeId of personIds) {
          await s.run(
            `MATCH (p:Person {nodeId: $nodeId}), (n:NewsItem {slug: $slug})
             MERGE (p)-[r:MENTIONED_IN]->(n) SET r.source = "csail-news", r.fetchedAt = $now`,
            { nodeId, slug, now: new Date().toISOString() }
          );
          mentionCount++;
        }
        for (const gslug of groupIds) {
          await s.run(
            `MATCH (g:Group {slug: $gslug}), (n:NewsItem {slug: $slug})
             MERGE (g)-[r:MENTIONED_IN]->(n) SET r.source = "csail-news", r.fetchedAt = $now`,
            { gslug, slug, now: new Date().toISOString() }
          );
          mentionCount++;
        }
      });
      articleCount++;
    } catch (e) {
      console.error(`  ${href}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (stopPaging) { console.log(`  hit cutoff, stopping`); break; }
}
await closeDriver();
console.log(`Done. ${articleCount} articles, ${mentionCount} mentions.`);

function parseDateMaybe(text: string | undefined): string | null {
  if (!text) return null;
  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
```

- [ ] **Step 2: Live-test**

```bash
bun pipeline/build.ts kg news 2>&1 | tail -10
```

Expected: ≥30 articles processed, mentions linked. Will take 3-10 min.

- [ ] **Step 3: Verify Floor 7 mentions**

```bash
curl -s -u neo4j:csail-dev-password -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (p:Person)-[:LOCATED_IN]->(r:Room {floor:7}) MATCH (p)-[:MENTIONED_IN]->(n:NewsItem) RETURN count(DISTINCT p) AS people, count(n) AS mentions"}]}' \
  http://localhost:7474/db/neo4j/tx/commit
```

Expected: ≥10 floor-7 people with at least one mention.

- [ ] **Step 4: Commit**

```bash
git add pipeline/kg/enrich/csail-news.ts
git commit -m "kg: CSAIL news scraper — link articles to known persons/groups"
```

---

## Task 15: Snapshot dump + restore

**Files:**
- Create: `pipeline/kg/snapshot/dump.ts`
- Create: `pipeline/kg/snapshot/restore.ts`

Neo4j-admin runs inside the container. We invoke it via `docker exec` and dump to the bind-mounted `/snapshots`.

- [ ] **Step 1: Write `pipeline/kg/snapshot/dump.ts`**

```ts
export {};
import { spawnSync } from "node:child_process";

const date = new Date().toISOString().slice(0, 10);
const filename = `csail-kg-${date}.dump`;

console.log("Stopping Neo4j to take consistent dump...");
spawnSync("docker", ["exec", "csail-neo4j", "neo4j", "stop"], { stdio: "inherit" });

console.log(`Dumping → snapshots/${filename}`);
const result = spawnSync(
  "docker",
  ["exec", "csail-neo4j", "neo4j-admin", "database", "dump", "neo4j", "--to-path=/snapshots", "--overwrite-destination=true"],
  { stdio: "inherit" }
);

console.log("Restarting Neo4j...");
spawnSync("docker", ["exec", "csail-neo4j", "neo4j", "start"], { stdio: "inherit" });

if (result.status !== 0) process.exit(result.status ?? 1);

// Neo4j 5 dumps as `neo4j.dump` — rename to dated filename.
spawnSync("mv", ["snapshots/neo4j.dump", `snapshots/${filename}`], { stdio: "inherit" });
console.log(`✓ snapshots/${filename}`);
```

- [ ] **Step 2: Write `pipeline/kg/snapshot/restore.ts`**

```ts
export {};
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dumps = readdirSync("snapshots").filter((f) => f.endsWith(".dump")).sort().reverse();
if (dumps.length === 0) { console.error("No dumps in snapshots/"); process.exit(1); }
const latest = dumps[0]!;
console.log(`Restoring from snapshots/${latest}`);

spawnSync("docker", ["exec", "csail-neo4j", "neo4j", "stop"], { stdio: "inherit" });
spawnSync("cp", [`snapshots/${latest}`, "snapshots/neo4j.dump"], { stdio: "inherit" });
const r = spawnSync(
  "docker",
  ["exec", "csail-neo4j", "neo4j-admin", "database", "load", "neo4j", "--from-path=/snapshots", "--overwrite-destination=true"],
  { stdio: "inherit" }
);
spawnSync("rm", ["snapshots/neo4j.dump"], { stdio: "inherit" });
spawnSync("docker", ["exec", "csail-neo4j", "neo4j", "start"], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`✓ restored ${latest}`);
```

- [ ] **Step 3: Live-test dump**

```bash
bun pipeline/build.ts kg snapshot dump
ls -lh snapshots/
```

Expected: `snapshots/csail-kg-2026-04-25.dump` exists.

- [ ] **Step 4: Update `.gitignore` to track the dated dump**

Replace the earlier line `snapshots/*.dump` with:
```
snapshots/neo4j.dump
```
(allows the dated dumps to be committed)

- [ ] **Step 5: Commit dump and code**

```bash
git add pipeline/kg/snapshot/dump.ts pipeline/kg/snapshot/restore.ts .gitignore snapshots/csail-kg-*.dump
git commit -m "kg: snapshot dump/restore + initial dump for teammates"
```

---

## Task 16: Agent KG access tools

**Files:**
- Create: `agents/kg/client.ts`
- Create: `agents/kg/types.ts`
- Create: `agents/kg/tools/floor.ts`
- Create: `agents/kg/tools/person.ts`

- [ ] **Step 1: Create `agents/kg/client.ts`** (re-exports the pipeline client for read access from the app)

```ts
export { withRead, withWrite, closeDriver } from "../../pipeline/kg/client";
```

- [ ] **Step 2: Create `agents/kg/types.ts`**

```ts
export type { Person, Group, Project, Paper, NewsItem, Area } from "../../shared/schema";

export interface FloorPerson {
  nodeId: string;
  name: string;
  title: string;
  isPI: boolean;
  roomNumber: string;
  groupNames: string[];
  recentPaperCount: number;
}

export interface PersonProfile {
  nodeId: string;
  name: string;
  title: string;
  bio?: string;
  isPI: boolean;
  isCoreOrDual: boolean;
  groups: { slug: string; name: string }[];
  rooms: { id: string; number: string; floor: number }[];
  recentPapers: { title: string; year: number; venue?: string; citationCount?: number }[];
  recentNews: { title: string; publishedAt: string; url: string }[];
  stale: boolean;
}
```

- [ ] **Step 3: Create `agents/kg/tools/floor.ts`**

```ts
import { withRead } from "../client";
import type { FloorPerson } from "../types";

export async function findPeopleOnFloor(floor: number): Promise<FloorPerson[]> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person)-[:LOCATED_IN]->(r:Room)
       WHERE r.floor = $floor
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper) WHERE pp.year >= $cutoff
       RETURN p.nodeId AS nodeId, p.name AS name, p.title AS title, p.isPI AS isPI,
              r.number AS roomNumber, collect(DISTINCT g.name) AS groupNames,
              count(DISTINCT pp) AS paperCount
       ORDER BY p.isPI DESC, p.name`,
      { floor: { low: floor, high: 0 }, cutoff: { low: new Date().getFullYear() - 2, high: 0 } }
    );
    return r.records.map((rec) => ({
      nodeId: rec.get("nodeId") as string,
      name: rec.get("name") as string,
      title: rec.get("title") as string,
      isPI: rec.get("isPI") as boolean,
      roomNumber: rec.get("roomNumber") as string,
      groupNames: (rec.get("groupNames") as string[]).filter(Boolean),
      recentPaperCount: (rec.get("paperCount") as { toNumber(): number }).toNumber(),
    }));
  });
}

export async function getFloorSummary(floor: number): Promise<{ floor: number; totalPeople: number; piCount: number; groupCount: number; paperCount: number }> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person)-[:LOCATED_IN]->(rm:Room) WHERE rm.floor = $floor
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
       RETURN count(DISTINCT p) AS people, count(DISTINCT CASE WHEN p.isPI THEN p END) AS pis,
              count(DISTINCT g) AS groups, count(DISTINCT pp) AS papers`,
      { floor: { low: floor, high: 0 } }
    );
    const rec = r.records[0]!;
    return {
      floor,
      totalPeople: (rec.get("people") as { toNumber(): number }).toNumber(),
      piCount: (rec.get("pis") as { toNumber(): number }).toNumber(),
      groupCount: (rec.get("groups") as { toNumber(): number }).toNumber(),
      paperCount: (rec.get("papers") as { toNumber(): number }).toNumber(),
    };
  });
}
```

- [ ] **Step 4: Create `agents/kg/tools/person.ts`**

```ts
import { withRead } from "../client";
import type { PersonProfile } from "../types";

export async function getPersonProfile(nodeId: string): Promise<PersonProfile | null> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person {nodeId: $nodeId})
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:LOCATED_IN]->(rm:Room)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
       OPTIONAL MATCH (p)-[:MENTIONED_IN]->(n:NewsItem)
       RETURN p, collect(DISTINCT g) AS groups, collect(DISTINCT rm) AS rooms,
              collect(DISTINCT pp) AS papers, collect(DISTINCT n) AS news`,
      { nodeId }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const p = rec.get("p").properties;
    const groups = (rec.get("groups") as { properties: any }[]).map((g) => ({ slug: g.properties.slug, name: g.properties.name }));
    const rooms = (rec.get("rooms") as { properties: any }[]).map((rm) => ({ id: rm.properties.id, number: rm.properties.number, floor: rm.properties.floor.toNumber?.() ?? rm.properties.floor }));
    const papers = (rec.get("papers") as { properties: any }[])
      .map((pp) => ({ title: pp.properties.title, year: pp.properties.year.toNumber?.() ?? pp.properties.year, venue: pp.properties.venue, citationCount: pp.properties.citationCount?.toNumber?.() ?? pp.properties.citationCount }))
      .sort((a, b) => b.year - a.year).slice(0, 10);
    const news = (rec.get("news") as { properties: any }[])
      .map((n) => ({ title: n.properties.title, publishedAt: n.properties.publishedAt, url: n.properties.url }))
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 5);
    return {
      nodeId: p.nodeId, name: p.name, title: p.title, bio: p.bio ?? undefined,
      isPI: p.isPI, isCoreOrDual: p.isCoreOrDual,
      groups, rooms, recentPapers: papers, recentNews: news, stale: p.stale,
    };
  });
}
```

- [ ] **Step 5: Smoke-test**

Create `/tmp/kg-tool-smoke.ts`:
```ts
import { findPeopleOnFloor, getFloorSummary } from "./agents/kg/tools/floor";
import { getPersonProfile } from "./agents/kg/tools/person";
import { closeDriver } from "./agents/kg/client";

console.log("Floor 7 summary:", await getFloorSummary(7));
const people = await findPeopleOnFloor(7);
console.log(`Floor 7 people: ${people.length}, first:`, people[0]);
const armando = people.find((p) => p.name === "Armando Solar-Lezama");
if (armando) console.log("Armando profile:", await getPersonProfile(armando.nodeId));
await closeDriver();
```

```bash
bun /tmp/kg-tool-smoke.ts && rm /tmp/kg-tool-smoke.ts
```

Expected: floor summary, ≥47 people, Armando profile with ≥1 paper.

- [ ] **Step 6: Commit**

```bash
git add agents/kg/
git commit -m "kg: typed agent access tools — floor + person queries"
```

---

## Task 17: Wire chat panel to KG

**Files:**
- Modify: `frontend/app/api/chat/route.ts`

- [ ] **Step 1: Read current chat route**

```bash
cat frontend/app/api/chat/route.ts
```

- [ ] **Step 2: Replace with KG-backed handler**

Path: `frontend/app/api/chat/route.ts`. Wire to `agents/kg/tools/floor.ts` for the demo. The handler accepts `{ message: string, floor?: number }` and routes to `findPeopleOnFloor` for any message containing "floor 7" or asking about people, falling back to a stub for everything else.

```ts
import { NextResponse } from "next/server";
import { findPeopleOnFloor, getFloorSummary } from "../../../../agents/kg/tools/floor";
import { closeDriver } from "../../../../agents/kg/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { message: string; floor?: number };
  const msg = (body.message ?? "").toLowerCase();
  const floor = body.floor ?? (msg.match(/floor\s+(\d)/)?.[1] ? parseInt(msg.match(/floor\s+(\d)/)![1]!, 10) : 7);

  try {
    if (/who|people|members?/.test(msg)) {
      const people = await findPeopleOnFloor(floor);
      const summary = await getFloorSummary(floor);
      const pis = people.filter((p) => p.isPI).slice(0, 5).map((p) => `${p.name} (${p.roomNumber}, ${p.groupNames[0] ?? p.title})`);
      return NextResponse.json({
        reply: `Floor ${floor} has ${summary.totalPeople} people across ${summary.groupCount} groups, with ${summary.paperCount} papers in the graph.\n\nNotable PIs: ${pis.join("; ")}`,
        people, summary,
      });
    }
    return NextResponse.json({ reply: "Try asking 'who's on floor 7?' or 'people on floor 7' to see live KG data.", people: [], summary: null });
  } finally {
    // keep driver open across requests in dev; close on shutdown only
  }
}
```

- [ ] **Step 3: Live-test the route**

```bash
# dev server should already be running from prior session
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" \
  -d '{"message":"who is on floor 7?"}' | head -c 500
```

Expected: JSON with `"reply"` containing "Floor 7 has 47 people..." and a `"people"` array of 47 entries.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/chat/route.ts
git commit -m "chat: wire /api/chat to live KG tools — floor 7 query end-to-end"
```

---

## Task 18: README quickstart

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README**

```bash
cat README.md
```

- [ ] **Step 2: Add a "Knowledge Graph" section**

Append to `README.md`:

```markdown

## Knowledge Graph (Neo4j)

Local Neo4j 5 + APOC, populated from `data/people.jsonl` (CSAIL directory scrape) and enriched with Semantic Scholar papers and CSAIL news.

### Quickstart

```bash
docker compose up -d                 # Neo4j on :7687 (bolt) and :7474 (browser)
bun pipeline:kg:schema               # apply constraints + indexes
bun pipeline:kg:ingest               # ingest 1,493 people from data/people.jsonl
bun pipeline:kg:enrich:floor7        # deep S2 enrichment for Floor 7 cohort (~10 min)
bun pipeline:kg:news                 # scrape last 3 years of CSAIL news (~5 min)
```

### From a snapshot (faster for teammates)

```bash
docker compose up -d
bun pipeline:kg:restore              # restore latest snapshot from snapshots/*.dump
```

### Browse the graph

Open http://localhost:7474 and log in with `neo4j` / `csail-dev-password`. Try:

```cypher
MATCH (p:Person)-[:LOCATED_IN]->(r:Room {floor: 7}) RETURN p, r
MATCH (p:Person)-[:AUTHORED]->(pp:Paper) WHERE p.name = "Armando Solar-Lezama" RETURN pp.title, pp.year ORDER BY pp.year DESC LIMIT 10
MATCH (a:Person)-[r:COAUTHORED_WITH]-(b:Person) RETURN a.name, b.name, r.paperCount ORDER BY r.paperCount DESC LIMIT 20
```

### Architecture

See `docs/superpowers/specs/2026-04-25-knowledge-graph-neo4j-design.md` for the full design.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README — Knowledge Graph quickstart"
```

---

## Final task: Push and verify

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

- [ ] **Step 2: Verify demo flow end-to-end**

1. Hit http://localhost:3000 — viz still renders
2. POST to `/api/chat` with "who's on floor 7?" — returns live KG data
3. Open http://localhost:7474 — graph visible

- [ ] **Step 3: Confirm acceptance criteria from spec**

- ≥1493 Person nodes ✓
- ≥120 Group nodes
- ≥300 Project nodes
- ≥500 Paper nodes (after Floor 7 enrichment)
- ≥30 COAUTHORED_WITH edges within Floor 7
- ≥20 Floor 7 persons with ≥1 MENTIONED_IN edge
- Snapshot dump committed

Done.

---

## Self-review notes

- **Spec coverage**: every spec section is mapped to a task — schema, ingest, enrichment (general + Floor 7), news, agent layer, snapshot, README. ✓
- **Type consistency**: `personId(nodeId)`, `groupId(slug)`, `paperId('s2:'+s2id)` used uniformly across clean-people / upsert / enrich. ✓
- **Placeholder-free**: every code step has complete code; no "implement appropriately" / "TODO" / "TBD". ✓
- **Cypher consistency**: `MERGE` patterns are identical between general and deep S2 enrichers — both write the same Paper props and AUTHORED edge with `confidence`. ✓
- **APOC dependency**: `apoc.create.addLabels` used in upsert-csail and upsert-hci-lab; bundled in the configured Neo4j image. ✓
- **Idempotency**: every ingest/enrich script uses `MERGE` and re-running advances `fetchedAt` instead of duplicating. ✓
- **Floor 7 depth**: Task 13 explicitly uncaps paper count for the cohort, computes COAUTHORED_WITH only within cohort, supports manual override file, satisfying the "thorough Floor 7 enrichment" requirement. ✓
