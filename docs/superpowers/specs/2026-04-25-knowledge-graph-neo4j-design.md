# CSAIL Knowledge Graph (Neo4j) — Design Spec

**Date:** 2026-04-25
**Author:** Dat Tran (with Claude)
**Status:** Draft for review
**Companion to:** `2026-04-25-knowledge-graph-and-3d-viz-design.md` (the original viz + KG design)

## Goal

Stand up a real graph database (Neo4j) as the canonical knowledge store for CSAIL: people, groups, projects, papers, news, rooms — and the typed relationships between them. Source CSAIL directory data from the existing 1,493-person scrape (`data/people.jsonl`), enrich with Semantic Scholar papers and CSAIL news mentions, and expose it through a typed agent access layer that the chat panel and future agent workflows consume.

The 3D visualization continues reading the existing `data/*.json` files for tomorrow's demo. Switching the viz to Neo4j is post-demo work.

## Architecture

```
       ┌──────────────────────────────┐
       │  data/*.json (current)       │
       │  rooms-floor-7-sample.json   │ ──→ Next.js API routes ──→ R3F viz   (UNCHANGED)
       │  groups.json                 │
       └──────────────────────────────┘

       ┌──────────────────────────────┐
       │  data/people.jsonl (scrape)  │
       │  hci.csail.mit.edu (scrape)  │  ──→ ingest ──→ Neo4j ──→ agent tools ──→ chat panel
       │  api.semanticscholar.org     │                             ↑
       │  csail.mit.edu/news (scrape) │                             │
       └──────────────────────────────┘                       (NEW for tomorrow)
```

Two paths share the `shared/schema/` types so the chat panel can render entities in the same shape the viz already uses.

## Locked-in decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Neo4j local Docker (Community 5.x) | One `docker compose up`. Snapshot dump committed so teammates can hydrate without rerunning the scrape pipeline. |
| 2 | Papers cap: 20 most recent globally, **uncapped for Floor 7 cohort** | Keeps S2 ingest tractable (1,493 × 20 = 30k upserts) while giving the demo cohort full depth. |
| 3 | Author disambiguation: name + MIT affiliation + ≥1 area/venue overlap; flag low-confidence | Cheap heuristic that handles the common-name problem. Manual review for Floor 7's 47 people is feasible; rest of CSAIL accepts low-confidence with a flag. |
| 4 | Stale records: keep all, mark `stale: true` if `last_updated` is older than 24 months | The 7% pre-'23 records are still part of CSAIL history. Chat agent discloses staleness when it surfaces them. |
| 5 | Bio cleaning: light regex pass at ingest | Collapse `\n` artifacts inside sentences, preserve paragraph breaks. Done once at ingest, raw kept in `bioRaw`. |
| 6 | Group kinds: separate Cypher labels (`Group:ResearchGroup` vs `Group:CommunityOfResearch`) | These are organizationally distinct at CSAIL. Two labels lets you query both as `(:Group)` or specifically as `(:Group:ResearchGroup)`. |
| 7 | Primary key: `nodeId` (CSAIL CMS id) | Stable, unique, present in 100% of records. Email and URL slug kept as alt keys. |

## Shared TypeScript types

All entities live under `shared/schema/`. Each interface is the contract both Cypher results and JSON file readers conform to.

### `shared/schema/ids.ts`

```ts
export type PersonId    = `person:${string}`;     // person:3831  (csail node_id)
export type GroupId     = `group:${string}`;      // group:visualization-group  (url slug)
export type ProjectId   = `project:${string}`;    // project:high-assurance-cryptography
export type PaperId     = `paper:${string}`;      // paper:s2:abc123  or paper:doi:10.x/y
export type NewsId      = `news:${string}`;       // news:csail:my-article-slug
export type RoomId      = `room:${string}`;       // room:32-G743
export type AreaId      = `area:${string}`;       // area:ai-and-ml
```

### `shared/schema/provenance.ts`

```ts
export interface Provenance {
  source: "csail-directory" | "hci-lab-scrape" | "semantic-scholar" | "csail-news" | "manual";
  sourceUrl?: string;
  fetchedAt: string;       // ISO 8601
  lastVerifiedAt?: string;
  confidence?: number;     // 0..1, used by enrichers with disambiguation
}
```

### `shared/schema/person.ts`

```ts
import type { PersonId, GroupId, ProjectId, PaperId, RoomId, AreaId } from "./ids";
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
  nodeId: string;             // primary key (CSAIL CMS id)
  name: string;
  title: string;              // raw scraped title
  role: CsailRole;            // normalized
  isPI: boolean;              // from role_tag
  isCoreOrDual: boolean;      // from role_category
  affiliation: string;        // "MIT CSAIL" by default, overridable

  aliases: PersonAliases;
  phone?: string;
  photoUrl?: string;
  bio?: string;               // cleaned
  bioRaw?: string;            // original

  // Foreign keys (typed edge endpoints)
  groupIds: GroupId[];
  projectIds: ProjectId[];
  paperIds: PaperId[];
  roomIds: RoomId[];
  researchAreaIds: AreaId[];
  impactAreaIds: AreaId[];

  stale: boolean;             // last_updated > 24mo
  lastUpdatedSource?: string; // raw "Last updated Mar 26 '24"
  provenance: Provenance;
}
```

### `shared/schema/group.ts`

```ts
import type { GroupId, PersonId, ProjectId, RoomId, PaperId } from "./ids";
import type { Provenance } from "./provenance";

export type GroupKind = "research-group" | "community-of-research";

export interface Group {
  id: GroupId;
  slug: string;               // from URL
  name: string;
  shortName?: string;
  kind: GroupKind;            // separate Cypher labels at write time
  url?: string;
  teaser?: string;

  piIds: PersonId[];          // PIs of this group
  memberIds: PersonId[];
  projectIds: ProjectId[];
  roomIds: RoomId[];
  paperIds: PaperId[];        // papers attributed to this group's members

  color?: string;             // viz-only
  provenance: Provenance;
}
```

### `shared/schema/project.ts`

```ts
import type { ProjectId, PersonId, GroupId } from "./ids";
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
```

### `shared/schema/paper.ts`

```ts
import type { PaperId, PersonId, GroupId } from "./ids";
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
  authorIds: PersonId[];      // resolved CSAIL persons (may be subset of true authors)
  externalAuthorNames: string[]; // non-CSAIL coauthors, by name only
  groupIds: GroupId[];        // inferred from authors' groups
  provenance: Provenance;
}
```

### `shared/schema/news.ts`

```ts
import type { NewsId, PersonId, GroupId, ProjectId } from "./ids";
import type { Provenance } from "./provenance";

export interface NewsItem {
  id: NewsId;
  slug: string;
  title: string;
  publishedAt: string;        // ISO date
  url: string;
  excerpt?: string;
  body?: string;              // optional full text
  personIds: PersonId[];
  groupIds: GroupId[];
  projectIds: ProjectId[];
  imageUrl?: string;
  provenance: Provenance;
}
```

### `shared/schema/area.ts`

```ts
import type { AreaId } from "./ids";

export type AreaKind = "research" | "impact";

export interface Area {
  id: AreaId;
  slug: string;
  name: string;
  kind: AreaKind;
}
```

### `shared/schema/edge.ts`

Edges are not the primary access pattern in TS (we mostly traverse via id arrays on entities), but enrichers need to write provenanced edges. This type captures the shape Cypher relationships will carry.

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

### Existing types (kept as-is)

`shared/schema/room.ts` is unchanged for the demo. Post-demo, `Room` gains `wing?: "G" | "D" | undefined` and `quadrant?: string`.

## Neo4j schema

### Node labels and constraints

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
CREATE INDEX paper_year IF NOT EXISTS FOR (p:Paper) ON (p.year);
```

### Multi-label writes for Group kind

```cypher
// Research group
MERGE (g:Group:ResearchGroup {slug: $slug})
SET g.name = $name, g.url = $url, g.kind = "research-group", ...

// Community of Research
MERGE (g:Group:CommunityOfResearch {slug: $slug})
SET g.name = $name, g.url = $url, g.kind = "community-of-research", ...
```

### Relationships

| Type | From → To | Properties |
|---|---|---|
| `MEMBER_OF` | Person → Group | `{since?, source, fetchedAt}` |
| `PI_OF` | Person → Group | `{source, fetchedAt}` |
| `LOCATED_IN` | Person → Room | `{source, fetchedAt}` |
| `LOCATED_IN` | Group → Room | `{source, fetchedAt}` |
| `WORKS_ON` | Person → Project | `{source, fetchedAt}` |
| `BELONGS_TO` | Project → Group | `{source, fetchedAt}` |
| `AUTHORED` | Person → Paper | `{authorOrder?, source, confidence, fetchedAt}` |
| `MENTIONED_IN` | Person → NewsItem | `{source, fetchedAt}` |
| `MENTIONED_IN` | Group → NewsItem | `{source, fetchedAt}` |
| `WORKS_IN_AREA` | Person → Area (research) | `{source, fetchedAt}` |
| `HAS_IMPACT_ON` | Person → Area (impact) | `{source, fetchedAt}` |
| `COAUTHORED_WITH` | Person → Person | `{paperCount, firstYear, lastYear, source, fetchedAt}` |

`COAUTHORED_WITH` is computed only inside the Floor 7 cohort during deep enrichment.

## Ingest pipeline

Layout under `pipeline/kg/`:

```
pipeline/kg/
  schema.cypher              // constraints + indexes (idempotent)
  client.ts                  // neo4j-driver wrapper, pool, parameterized helpers
  ingest/
    clean-people.ts          // normalize one record from people.jsonl
    upsert-csail.ts          // bulk MERGE of all 1,493 people + their groups/projects/areas/rooms
    upsert-hci-lab.ts        // bulk MERGE of HCI Lab members from hci-lab.json
  enrich/
    semantic-scholar.ts      // throttled S2 enrichment; default cap 20
    semantic-scholar-deep.ts // Floor 7 specific: uncapped, with coauthor edges
    csail-news.ts            // scrape csail.mit.edu/news, link entities
  snapshot/
    dump.ts                  // neo4j-admin database dump → snapshots/csail-kg-YYYY-MM-DD.dump
    restore.ts               // restore from latest dump
```

### Cleaning logic (`clean-people.ts`)

Per record:
1. `nodeId` → `id = "person:" + nodeId`
2. `title` → `role` via lookup table (133 raw titles → 16 normalized roles, with explicit unmapped → `"other"` and a warning log)
3. `last_updated` parse: `"Last updated Mar 26 '24"` → ISO date; if older than 24mo set `stale: true`
4. `research_areas` / `impact_areas`: dedup, slugify
5. `groups[]`: dedup by URL, slugify, classify kind from `type` field
6. `projects[]`: dedup by URL, slugify
7. `bio`: collapse `\n` between lowercase letters into single space; preserve double-newline paragraph breaks; `bioRaw` keeps the original
8. `phone`: prefix `617-253-` if 7-digit and starts with `2` or `3` (matches CSAIL block); else keep as-is
9. `room`: parse to `{ id, floor, wing? }`; create Room node if missing (placeholder polygon)
10. Synthesize `Provenance { source: "csail-directory", sourceUrl: url, fetchedAt: now() }`

### Upsert logic

Single transaction per person (acceptable for 1,493 records). Each upsert MERGEs the Person, MERGEs each related Group/Project/Room/Area, then MERGEs the relationships. Idempotent — re-running advances `fetchedAt` and `lastVerifiedAt` without duplicating edges.

```cypher
// One person
MERGE (p:Person {nodeId: $nodeId})
SET p += $personProps
WITH p
UNWIND $groups AS grp
  CALL {
    WITH grp
    CALL apoc.merge.node([\"Group\", grp.kindLabel], {slug: grp.slug}, grp.props, grp.props) YIELD node
    RETURN node AS g
  }
  MERGE (p)-[r:MEMBER_OF]->(g)
  SET r.source = "csail-directory", r.fetchedAt = $now
WITH p
UNWIND $rooms AS room
  MERGE (rm:Room {id: room.id})
  SET rm += room.props
  MERGE (p)-[r:LOCATED_IN]->(rm)
  SET r.source = "csail-directory", r.fetchedAt = $now
// ... same for projects, areas
```

(APOC is bundled with the official `neo4j:5` Docker image when `NEO4J_PLUGINS='[\"apoc\"]'` is set.)

## Enrichment

### Semantic Scholar (`semantic-scholar.ts`)

For each Person not flagged `skipPapers`:
1. Query `https://api.semanticscholar.org/graph/v1/author/search?query={name}+MIT`
2. Pick best match: highest paper count among results whose `affiliations` contains `"MIT"` or `"Massachusetts Institute of Technology"`
3. Compute confidence:
   - 1.0 if ≥2 of (homepage matches, email domain matches, ≥1 paper venue maps to a known CSAIL research area) line up
   - 0.7 if affiliation matches and ≥1 venue overlap
   - 0.4 if name+affiliation only
   - <0.4: skip, log to `data/disambiguation-flags.jsonl` for manual review
4. Pull author's papers via `/author/{id}/papers?fields=title,year,abstract,venue,citationCount,influentialCitationCount,externalIds,authors,openAccessPdf&limit=20` (sort by year desc)
5. Upsert each Paper, attach `AUTHORED` edge with `authorOrder` (position in `authors` list)
6. Throttle: 1 req/sec (S2 unauthenticated). Resumable via `data/s2-progress.jsonl` checkpoint per nodeId.

### Floor 7 deep enrichment (`semantic-scholar-deep.ts`)

For the **Floor 7 cohort** (47 CSAIL-listed people in `32-G7XX` rooms + 39 HCI Lab members, deduped by name/email):

1. **Uncapped paper sweep**: pull all papers per person, no `limit`
2. **Coauthor edges within cohort**: after all Floor 7 papers loaded, for any Paper authored by ≥2 Floor 7 people, write `COAUTHORED_WITH` edges with `paperCount`, `firstYear`, `lastYear`
3. **Manual disambiguation review**: write `data/floor-7-author-candidates.jsonl` listing top 3 S2 candidates per Floor 7 person. I review and lock in the chosen `semanticScholarAuthorId` to `data/floor-7-author-overrides.json`. Re-running enrichment respects overrides.
4. **News mention deep pass**: scrape last 3 years of CSAIL news, attach `MENTIONED_IN` edges for any Floor 7 person/group, store article body (not just excerpt)
5. **Provenance flag**: every Paper attached this way carries `provenance.source = "semantic-scholar"` plus `provenance.confidence`

This makes the chat panel queries against Floor 7 (the demo subject) hit a richly connected subgraph.

### CSAIL news (`csail-news.ts`)

1. Scrape `https://www.csail.mit.edu/news?page={n}` until empty or 3 years old (configurable)
2. For each article, extract: title, publishedAt, body, embedded `<a href="/person/...">` and `<a href="/research/...">` links
3. Resolve each link to a `nodeId` (person) or `slug` (group/project) — if the entity exists in Neo4j, attach `MENTIONED_IN`; else log to `data/news-orphans.jsonl`
4. Store article in Neo4j as `NewsItem`

## Agent access layer

Layout under `agents/kg/`:

```
agents/kg/
  client.ts                  // re-export of neo4j driver, read-only session helper
  tools/
    floor.ts                 // findPeopleOnFloor, findGroupsOnFloor, getFloorSummary
    person.ts                // getPerson, findCollaboratorsOf, findRecentPapersBy
    group.ts                 // getGroup, listGroupMembers, listGroupProjects
    paper.ts                 // findPapersInArea, findPapersByYear
    search.ts                // typedSearch(query, kinds[]) — text search across labels
  types.ts                   // re-exports of shared/schema types
```

All tools take typed inputs, return typed outputs (the `shared/schema` interfaces). Cypher is parameterized — no string concatenation. The chat handler in `frontend/app/api/chat/route.ts` will eventually wire to these; for tomorrow we wire one or two tools as proof.

Example tool signature:

```ts
export async function findPeopleOnFloor(floor: number): Promise<Person[]> {
  const session = client.session({ defaultAccessMode: "READ" });
  try {
    const result = await session.run(
      `MATCH (p:Person)-[:LOCATED_IN]->(r:Room)
       WHERE r.floor = $floor
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       RETURN p, collect(DISTINCT g) AS groups, collect(DISTINCT r) AS rooms`,
      { floor: neo4j.int(floor) }
    );
    return result.records.map(toPerson);
  } finally {
    await session.close();
  }
}
```

## Provenance & staleness

Every Cypher-written entity and edge carries `source` and `fetchedAt`. Person nodes additionally carry:
- `lastUpdatedSource` (raw scraped string)
- `lastUpdatedAt` (parsed ISO)
- `stale` (boolean, true if `lastUpdatedAt` > 24mo old)

Chat agent surface contract: when responding with a `stale` person, the response template prepends a one-line caveat ("Note: this profile hasn't been updated since 2021").

## Tomorrow demo scope (critical path)

1. `docker-compose.yml` at repo root: Neo4j 5 Community + APOC plugin, single volume, exposed on `:7687` (bolt) and `:7474` (browser). Healthcheck so app can wait on it.
2. `shared/schema/` types written and exported.
3. `pipeline/kg/schema.cypher` applied; constraints and indexes live.
4. `pipeline/kg/ingest/upsert-csail.ts`: full 1,493-person ingest runs end-to-end. Idempotent.
5. `pipeline/kg/ingest/upsert-hci-lab.ts`: HCI Lab members merged in (matched to CSAIL persons by email when possible).
6. `pipeline/kg/enrich/semantic-scholar-deep.ts`: Floor 7 cohort fully enriched. Paper count target: ≥500 papers in graph.
7. `pipeline/kg/enrich/csail-news.ts`: last 3 years of CSAIL news ingested. Mention target: ≥20 Floor 7 people with at least one news mention.
8. `agents/kg/tools/floor.ts` + `agents/kg/tools/person.ts` written and unit-callable.
9. `frontend/app/api/chat/route.ts` updated to call at least one Cypher-backed tool (e.g., "who's on floor 7?") and return real data.
10. `pipeline/kg/snapshot/dump.ts` produces a committable snapshot under `snapshots/`. (Snapshot file is committed; `.gitignore` allows it.)
11. README updated with `docker compose up` + `bun pipeline kg ingest` quickstart.

Skip targets (not blocking demo):
- General S2 enrichment for non-Floor-7 people (let it run after demo)
- Viz wiring to Neo4j
- Graph view UI
- Author disambiguation polish for non-Floor-7 records

## Post-demo scope

- S2 sweep across the rest of CSAIL (~50 hour run at 1 req/sec, but parallelizable across multiple S2 keys)
- Switch viz API routes to Neo4j-backed reads
- Implement the deferred graph view UI (force-directed, runs `MATCH` on demand)
- Add `Room` polygons for all 9 floors (currently only Floor 7 sample exists)
- Advisor edges (no clean source — would require manual ingest or paper-coauthor inference)
- Author embedding for fuzzier disambiguation

## File structure (full)

```
csail-complete/
├── docker-compose.yml                              [NEW]
├── snapshots/                                      [NEW, gitignored except dump file]
│   └── csail-kg-2026-04-25.dump
├── shared/schema/
│   ├── ids.ts                                      [NEW]
│   ├── provenance.ts                               [NEW]
│   ├── person.ts                                   [NEW — replaces existing in kg.ts]
│   ├── group.ts                                    [NEW — replaces existing in kg.ts]
│   ├── project.ts                                  [NEW]
│   ├── paper.ts                                    [NEW]
│   ├── news.ts                                     [NEW]
│   ├── area.ts                                     [NEW]
│   ├── edge.ts                                     [NEW]
│   ├── room.ts                                     [unchanged]
│   ├── kg.ts                                       [DEPRECATED — re-exports new types for back-compat with viz]
│   └── index.ts                                    [NEW barrel export]
├── pipeline/kg/
│   ├── schema.cypher                               [NEW]
│   ├── client.ts                                   [NEW]
│   ├── ingest/
│   │   ├── clean-people.ts                         [NEW]
│   │   ├── upsert-csail.ts                         [NEW]
│   │   └── upsert-hci-lab.ts                       [NEW]
│   ├── enrich/
│   │   ├── semantic-scholar.ts                     [NEW]
│   │   ├── semantic-scholar-deep.ts                [NEW]
│   │   └── csail-news.ts                           [NEW]
│   └── snapshot/
│       ├── dump.ts                                 [NEW]
│       └── restore.ts                              [NEW]
├── agents/kg/
│   ├── client.ts                                   [NEW]
│   ├── types.ts                                    [NEW]
│   └── tools/
│       ├── floor.ts                                [NEW]
│       ├── person.ts                               [NEW]
│       ├── group.ts                                [NEW]
│       ├── paper.ts                                [NEW]
│       └── search.ts                               [NEW]
├── frontend/app/api/chat/route.ts                  [MODIFIED — wire to one KG tool]
├── data/
│   ├── people.jsonl                                [unchanged input]
│   ├── floor-7-author-candidates.jsonl             [NEW, generated]
│   ├── floor-7-author-overrides.json               [NEW, hand-edited]
│   ├── disambiguation-flags.jsonl                  [NEW, generated]
│   ├── news-orphans.jsonl                          [NEW, generated]
│   └── s2-progress.jsonl                           [NEW, generated checkpoint]
└── pipeline/build.ts                               [MODIFIED — add `kg` subcommand router]
```

## Risks

| Risk | Mitigation |
|---|---|
| S2 rate limits hit during deep enrichment | Resumable checkpoint (`s2-progress.jsonl`); cohort is small enough to fit in S2's unauth budget over a single run. |
| Disambiguation false positives in deep cohort | Manual override file (`floor-7-author-overrides.json`) gives final say. |
| APOC unavailable in chosen Neo4j image | Fall back to writing kind label client-side via separate Cypher per group kind (slightly more code, no APOC dependency). |
| Neo4j Docker on M-series Mac perf | Community 5.x runs natively on arm64; tested in similar projects. Memory: 1G heap is plenty for this dataset. |
| Snapshot dump format version drift | Pin Neo4j version in compose file (`neo4j:5.20.0` or whatever current LTS-equivalent is). |
| Existing viz breaks if `shared/schema/kg.ts` removed | Keep `kg.ts` as a re-export shim during transition. |

## Success criteria (demo)

- `docker compose up` produces a healthy Neo4j in <30s.
- `bun pipeline kg ingest` runs cleanly on a fresh DB; counts: 1,493 Person nodes, ≥120 Group nodes, ≥300 Project nodes.
- `bun pipeline kg enrich --floor 7` finishes; ≥500 Paper nodes, ≥30 COAUTHORED_WITH edges within Floor 7.
- `bun pipeline kg news --years 3` finishes; ≥20 Floor 7 persons have ≥1 MENTIONED_IN edge.
- Chat endpoint returns live Cypher-backed data for at least one query type.
- Snapshot file committed; teammate can run `bun pipeline kg restore && docker compose up` and have an identical graph.

## Out of scope for this spec

- Authentication / multi-user access to Neo4j (single-tenant local dev)
- Production deployment (Aura, k8s, etc.)
- Embedding-based similarity search
- Real-time updates from CSAIL site (re-scrape is manual cron for now)
- LLM choice for chat agent (continues per existing design — OpenRouter-fronted)
