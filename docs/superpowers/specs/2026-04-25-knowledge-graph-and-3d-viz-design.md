# Knowledge Graph + 3D Stata Visualization — Design Spec

**Date:** 2026-04-25
**Author:** Dat Tran (solo on KG + viz; 4 teammates on other components)
**Status:** Approved through brainstorming; ready for implementation planning
**Scope:** First visualization test — NOT the full hackathon demo
**Demo target:** Tomorrow evening (2026-04-26) — but tomorrow's elaborate demo is a separate effort; this spec covers what we ship to validate the visual direction

---

## 1. Context

We're building **CSAIL Complete**: a living graph of CSAIL (people, groups, papers, projects) layered with an agent ecosystem. Full vision is in `docs/OVERVIEW.md`. This spec covers two of the six components from OVERVIEW:

- **Component 1 — Knowledge Graph** (substrate)
- **Component 2 — Visualization & Interaction Layer** (surface)

The eventual visualization will render **the complete 3D architecture of Stata**, with chat that pinpoints rooms and routes to graph nodes. This spec scopes the **first prototype** of that vision: floor 7 only, hand-seeded data for one group (HCI Lab), enough to validate that "stylized 3D Stata + drilled-in floor plan + room sidecar" feels right before we invest in scrapers, embeddings, full graph traversal, agent runtime, or chat wiring.

**Out of scope for this spec:** chat → KG tool use, agent DNA, full UMAP graph view, scraping all CSAIL groups, all 9 floors, embeddings, Cloudflare deployment.

---

## 2. Decisions Locked During Brainstorming

| Decision | Choice | Rationale |
|---|---|---|
| Building fidelity | **Stylized Stata** — recognizable silhouette, not literal Gehry | "Anyone seeing it should think 'that's Stata'." Cheap to author, beautiful to render. |
| Layout — viz vs. graph | **Hybrid: D primary, C escape** — Stata is the canvas, graph appears on demand inline; full UMAP view available via toggle | Keeps Stata as hero; graph view always reachable. |
| Pinpoint granularity | **Room-level (Option D)** | Every room identifiable; floor-plan PDF makes it feasible. |
| Demo scope (long term) | Full Stata, all floors, ~450 rooms | This is the eventual product. |
| Demo scope (this round) | **Floor 7 only**, fully populated | Polish > breadth for the first visual test. |
| Storage | **Local SQLite + JSON files**, defer Cloudflare | Solo + 24h. Team will migrate infra later. |
| 3D library | **React-Three-Fiber** | Declarative, plays with React-based UI. |
| App framework | **Next.js (app router)** | One server, API routes for KG queries. |
| Chat LLM | **OpenRouter** | Provider-swappable; Claude/GPT/etc. via single interface. |
| KG architecture | **Approach 2 + agents/ folder** — separate `pipeline/` (build data), `frontend/` (serve data), `agents/` (substrate) | Slow batch jobs don't tangle with fast UI iteration; agent layer cleanly isolated. |

---

## 3. Architecture — Folder Layout

```
csail-complete/
├── pipeline/                      # KG + viz data construction (batch jobs)
│   ├── scrapers/
│   │   ├── README.md              # intent: scrape CSAIL/Semantic Scholar/MIT directory; full impl deferred
│   │   └── hci-lab.ts             # ONLY scraper this round — ~30 lines cheerio/playwright
│   ├── pdf-trace/
│   │   ├── inspect.ts             # detects vector vs raster PDF
│   │   ├── extract-vector.ts      # SVG path → polygon + label parsing
│   │   └── trace-manual/          # placeholder — only built if vector extract fails
│   │       └── README.md
│   ├── embed/
│   │   └── README.md              # intent: OpenRouter embeddings → SQLite; deferred
│   └── build.ts                   # CLI: `bun pipeline/build.ts <subcommand>`
│
├── data/                          # build artifacts (gitignored)
│   ├── rooms-floor-7.json         # output of pdf-trace
│   ├── rooms-floor-7-sample.json  # committed fallback (6-room grid) for graceful degradation
│   ├── people.json                # output of hci-lab scraper
│   ├── people-fallback.json       # committed seed for HCI Lab
│   ├── groups.json                # hand-edited: HCI Lab + 3 other floor-7 groups (4 total)
│   └── stata-model.glb            # 3D Stata exterior asset (Sketchfab or procedural)
│
├── agents/                        # substrate — mostly stubbed this round
│   ├── README.md                  # intent: see OVERVIEW Components 3 + 4
│   ├── dna/
│   │   └── README.md              # intent: agent DNA spec; deferred
│   ├── runtime/
│   │   └── README.md              # intent: context retrieval, tool palette, orchestrator; deferred
│   └── library/
│       └── README.md              # intent: chat-agent, briefing-agent, etc.; deferred
│
├── shared/
│   └── schema/
│       ├── kg.ts                  # Person, Group, basic edges
│       ├── room.ts                # Room polygon + metadata types
│       └── dna.ts                 # re-export from agents/dna (placeholder for now)
│
├── frontend/                      # Next.js — pure consumer; never writes to data/
│   ├── app/                       # Next.js app router
│   │   ├── layout.tsx
│   │   ├── page.tsx               # /  → main 3D scene
│   │   └── floor/[n]/room/[id]/
│   │       └── page.tsx           # deep-link route — same scene, pre-selected room
│   ├── components/
│   │   ├── stata/
│   │   │   ├── Scene.tsx          # R3F <Canvas>
│   │   │   ├── StataExterior.tsx  # the building model
│   │   │   ├── Floor.tsx          # the floor plate + extruded rooms
│   │   │   ├── RoomMesh.tsx       # individual room polygon → mesh
│   │   │   └── CameraController.tsx
│   │   ├── graph/
│   │   │   └── README.md          # intent: full UMAP view; placeholder modal only
│   │   ├── cards/
│   │   │   ├── RoomCard.tsx       # sidecar
│   │   │   └── FloorCard.tsx      # default sidecar when floor entered, no room selected
│   │   └── chat/
│   │       └── ChatBar.tsx        # visual stub — canned response only
│   ├── lib/
│   │   └── store.ts               # Zustand UI state
│   └── api/
│       ├── kg/
│       │   ├── room/[id]/route.ts # joins rooms + groups + people
│       │   └── floor/[n]/route.ts # floor summary
│       └── chat/route.ts          # stub — echoes input + canned reply
│
└── docs/
    ├── OVERVIEW.md
    └── superpowers/specs/
        └── 2026-04-25-knowledge-graph-and-3d-viz-design.md  ← this file
```

**Dependency direction (one way only, enforced by layout):**

- `pipeline/` → `shared/` (writes data conforming to schema)
- `agents/` → `shared/` and reads `data/`
- `frontend/` → `agents/` and `shared/` (never reads `data/` directly; goes through agent runtime tools — though for this round, `frontend/api/kg/*` reads `data/` directly because agent runtime is stubbed)

When `agents/runtime/` is built in a future round, `frontend/api/kg/*` will switch to invoking it instead of reading `data/`. The route shape stays the same; consumers don't notice.

---

## 4. Section 1 — Data Model

### `shared/schema/room.ts`

```ts
export type Polygon = [number, number][];          // 2D floor-plan coords
export type RoomType = "office" | "lab" | "conference" | "common" | "service";

export interface Room {
  id: string;            // "32-G785"  (building-floor-room)
  number: string;        // "G785"
  floor: number;         // 7
  polygon: Polygon;      // floor-plan polygon, raw coords from PDF
  type: RoomType;
  label?: string;        // human-readable: "HCI Lab common space"
}
```

### `shared/schema/kg.ts`

```ts
export interface Person {
  id: string;
  name: string;
  affiliation: string;        // "CSAIL"
  groupIds: string[];         // FK → Group.id
  roomIds: string[];          // FK → Room.id (direct office assignment)
  bio?: string;
  homepage?: string;
}

export interface Group {
  id: string;                 // "hci-lab"
  name: string;               // "HCI Lab"
  shortName?: string;         // "HCI"
  url?: string;
  roomIds: string[];          // primary spaces (floor 7 rooms here)
  memberIds: string[];        // FK → Person.id
}
```

### Data artifact shapes

- `data/rooms-floor-7.json` — `Room[]`, output of `pipeline/pdf-trace`
- `data/people.json` — `Person[]`, output of `pipeline/scrapers/hci-lab.ts` for HCI Lab; expanded in later rounds
- `data/groups.json` — `Group[]`, hand-edited for this round; 4 entries (HCI Lab + 3 neighboring floor-7 groups so the floor doesn't look empty)

### Schema rationale

- **Flat JSON, no SQLite this round.** ~15 people doesn't justify a DB. SQLite slot-in lands when scrapers cover more groups.
- **IDs are stable strings**, not auto-increment — referenced in seed data and cross-linked.
- **Edges encoded as FK arrays on the nodes** (`groupIds`, `roomIds`) instead of a separate edge table. Simpler for MVP. When the graph gets dense (relationships table needed for `co-authored`, `advises`, `cites`, etc.), promote to SQLite + a `relationships` table.
- **`Room.polygon` lives in floor-plan coordinate space.** R3F transforms to world coordinates at render time. Data file stays independent of 3D presentation.

### Seed data (this round)

Hand-edit `data/groups.json` with HCI Lab + 3 known floor-7 groups (4 total, so the floor feels populated even before broader scraping). HCI Lab members come from the scraper. Other groups: 1–2 hand-typed faculty names per group as placeholders.

---

## 5. Section 2 — Pipelines

### `pipeline/pdf-trace/` — getting room polygons from the floor-plan PDF

**Two-tier strategy:**

1. **`extract-vector.ts` — try first.** Architectural PDFs are usually vector. Parse SVG paths from the PDF, extract polygons + nearby `<text>` elements as room numbers. ~30 minutes of work; gets all of floor 7 in seconds if the PDF is structured. Output: `data/rooms-floor-7.json` matching the `Room[]` schema.

2. **`trace-manual/` — fallback.** Only built if vector extract fails. A custom HTML tool that loads the PDF page as image, lets the user click polygon points, type room number, save to JSON. ~30s/room, ~25 minutes for floor 7. **We defer building this until we run the vector extract pass and see what it produces.**

CLI:
```bash
bun pipeline/build.ts trace-floor 7      # runs extract-vector, falls back to manual prompt
bun pipeline/build.ts inspect floor-plans.pdf   # prints PDF structure analysis
```

### `pipeline/scrapers/hci-lab.ts` — tiny seed scraper

Single-purpose script:
- Fetches the HCI Lab people page (URL TBD during implementation — likely `hci.csail.mit.edu` or wherever the user identifies)
- Extracts member names + roles + (optionally) photos
- Writes to `data/people.json`
- Patches `data/groups.json` `hci-lab` entry's `memberIds`

~30 lines of cheerio or playwright. No retries, no rate limiting — runs once, locally, by hand.

CLI:
```bash
bun pipeline/scrapers/hci-lab.ts
```

### 3D Stata model — `data/stata-model.glb`

**Sourcing strategy, in priority order:**

1. **Sketchfab / free model search first.** Search "MIT Stata Center" — community models likely exist as `.glb`. ~30 min find/import/license-check. **First try.**
2. **Procedural sketch in code as fallback.** Model Stata as a small set of leaning gradient-shaded boxes + cylinders + brick base + amphitheater + Cambridge skyline silhouette, matching the v2 mockup aesthetic exactly. ~150 lines of JSX. Aesthetic guaranteed; no asset dependency. ~3h.
3. **Quick Blender pass.** Last resort, ~4–6h.

Either way, the asset (or procedural component) lives behind `<StataExterior>` and is swappable. Other scene code doesn't care.

### Floor 7 rendering — `frontend/components/stata/`

Pure R3F from the JSON:

```tsx
// frontend/components/stata/Floor.tsx — sketch
function Floor({ rooms, level = 7 }: { rooms: Room[]; level: number }) {
  return (
    <group position={[0, level * FLOOR_HEIGHT, 0]}>
      <mesh receiveShadow>
        <planeGeometry args={[FLOOR_W, FLOOR_D]} />
        <meshStandardMaterial color="#1a1a24" />
      </mesh>
      {rooms.map(room => (
        <RoomMesh key={room.id} room={room} onSelect={...} />
      ))}
    </group>
  );
}
```

Each `<RoomMesh>` extrudes the polygon into a low wall + colored floor patch (color from the room's owning group), adds a `<Text>` label from drei at the centroid, glows on hover/select.

**Materials:** dark base + colored floor patches per group + thin wall outlines. Looks intentional even if low-effort.

**Lighting:** one warm point light per occupied room (people present → room glows). Ambient elsewhere. Free "rooms with people in them have life" effect.

**Composition:** single R3F `<Canvas>` containing:
1. `<StataExterior />` — the model — visible at all times
2. `<Floor level={7} rooms={...} />` — slightly above the model — fades in when camera height drops below threshold
3. `<CameraController />` — uses drei `<CameraControls>` for smooth fly-to

---

## 6. Section 3 — Interaction, State, Verification

### Interaction flow (the only path that has to work this round)

```
1. App load
   → R3F <Canvas> mounts
   → Stylized Stata exterior visible
   → Floor-7 ring pulses gently
   → Empty chat panel + "⌘G full graph" button visible (visual chrome only)

2. Click anywhere on Stata, OR press Enter on the floor-7 ring
   → Camera flies in (drei <CameraControls> setLookAt with smooth: true)
   → Stata exterior fades to ~30% opacity (still visible as context)
   → Floor 7 plate fades in with all room polygons
   → Default sidecar card: "Floor 7 · 32-G7 · Gates Tower · N rooms · M groups"

3. Hover a room
   → Room highlights (brightens + outline)
   → Tiny tooltip: room number + group name

4. Click a room (e.g., HCI Lab)
   → Camera dollies closer to that room
   → Room "selected" state (sustained glow, color saturation up)
   → Sidecar card swaps to room detail: group, members, recent activity stub
   → URL updates: /floor/7/room/G-743 (deep-linkable for demo recovery)

5. Click empty floor space, OR press Esc
   → Selection clears, sidecar reverts to floor summary, camera dollies back

6. Click "← back to building," OR press Esc twice
   → Camera flies back to exterior, floor 7 fades out, ring resumes pulsing

7. ⌘G or "full graph" button
   → Opens placeholder modal "Full graph view — coming next round"
   → Architecture supports it (toggle + state slot exist), UMAP not built yet
```

### State management — `frontend/lib/store.ts` (Zustand, ~30 lines)

```ts
interface UIState {
  view: "exterior" | "floor";
  activeFloor: number | null;          // 7 when drilled in
  selectedRoomId: string | null;       // "32-G743" when room clicked
  hoveredRoomId: string | null;
  chatOpen: boolean;                   // visual only this round
  graphOpen: boolean;                  // shows placeholder modal

  enterFloor(n: number): void;
  selectRoom(id: string): void;
  clearSelection(): void;
  exit(): void;
}
```

Camera target is **derived** from these flags via a `useCameraTarget()` hook — no manual camera state, fewer ways to desync.

### Sidecar card — `frontend/components/cards/RoomCard.tsx`

- Reads `selectedRoomId` + `activeFloor` from store
- Calls `/api/kg/room/[id]` (server reads `data/rooms-floor-7.json` + `data/groups.json` + `data/people.json`, joins, returns)
- Displays: room number, type, occupying group, group members, recent-activity stub ("X papers this month" — hard-coded for now since no real paper data yet)

### Chat panel — `frontend/components/chat/ChatBar.tsx`

- Glassmorphic input matching the v2 mockup
- Submit handler returns canned response: "Chat agent coming next round — for now, click rooms directly to explore."
- Bound API route `/api/chat` exists as a stub (echoes input + canned reply)
- Wires into `agents/library/chat-agent.ts` later, no behavioral change in `frontend/`

### Aesthetic reference

Visual aesthetic locked from the v2 mockup at `.superpowers/brainstorm/28684-1777140090/content/floor7-render-concept-v2.html`. Key elements to preserve in implementation:

- Opposing tower lean (Gates yellow tilts left, Dreyfoos silver tilts right)
- Gradient materials with inset shadows
- Brick base across the bottom
- Copper amphitheater pavilion
- Distant Cambridge skyline silhouette
- Atmospheric ground fog
- Lit windows (some rooms glow, some dim)
- Pulsing floor-7 highlight ring with thin lead-line label
- Monospace UI chrome, glassmorphic cards/inputs
- Floor plate has interior structural grid
- Rooms colored by group, glowing point-people inside

### Graceful degradation

- PDF tracing fails / no `rooms-floor-7.json` → fallback to committed `data/rooms-floor-7-sample.json` (6-room grid). App still runs.
- HCI scraper fails → committed `data/people-fallback.json` with 3 hand-typed HCI Lab faculty. App still shows real names.
- Stata Sketchfab model fails to load → procedural fallback renders, matches v2 mockup.
- `/api/kg` or `/api/chat` 500s → sidecar shows "couldn't load — refresh." No crash boundary swallows the whole app.

### Verification — what "done" looks like

Manual smoke test, in order. If all 9 pass, ship it:

```
[ ] 1. `bun pipeline/build.ts trace-floor 7`     → produces data/rooms-floor-7.json
[ ] 2. `bun pipeline/scrapers/hci-lab.ts`        → produces/updates data/people.json
[ ] 3. `bun dev` (in `frontend/`)                 → app starts on :3000, no console errors
[ ] 4. Open localhost:3000 → see stylized Stata, floor-7 ring pulses
[ ] 5. Click building → camera flies in, floor 7 plate fades in with all rooms visible
[ ] 6. Hover rooms → highlight + tooltip works on every room
[ ] 7. Click HCI Lab → sidecar shows real HCI Lab members from scraper
[ ] 8. Press Esc → returns to exterior, ring resumes pulsing
[ ] 9. Click ⌘G → "coming next round" modal appears (proves graph slot exists)
```

**No automated tests this round** — solo + 24h + first viz prototype. Manual against the 9-step checklist is the discipline.

---

## 7. Out of Scope (Explicit)

To prevent scope creep during implementation, the following are **deliberately deferred** and should NOT be built this round:

- Chat → KG tool use (chat is a visual stub)
- Full UMAP graph view (placeholder modal only)
- Agent DNA / runtime (folders + READMEs only)
- Embeddings (no Vectorize, no semantic queries)
- Scraping beyond HCI Lab (people/groups for other floors hand-stubbed)
- Floors other than 7 (procedural shells in the exterior model are fine; no interior detail)
- Cloudflare deployment (local dev only)
- SQLite (JSON files suffice at this scale)
- Authentication, multi-user, persistence beyond local files
- Mobile / projector legibility tuning (deferred to demo prep round)
- Privacy review of seeded people (HCI Lab faculty are public figures; will revisit before any wider demo)

---

## 8. Long-Term Trajectory

This round is the foundation. The architecture supports the full vision without restructuring:

- **Adding floors 1–6, 8, 9:** trace each floor's PDF → drop JSON in `data/rooms-floor-N.json`. App auto-loads.
- **Adding scrapers:** new files in `pipeline/scrapers/`. Each writes to `data/people.json` and `data/groups.json`. App reads more data, no code changes.
- **Adding embeddings:** SQLite migration in `pipeline/embed/`. Schema in `shared/schema/`. New `/api/kg/search` route.
- **Adding chat:** unstub `agents/library/chat-agent.ts` with OpenRouter + tool use. `/api/chat` swaps from stub to real handler. UI unchanged.
- **Adding full graph view:** unstub `frontend/components/graph/`. Toggle modal becomes real UMAP view. State slot already exists.
- **Cloudflare migration:** `pipeline/` → nightly Workers; `frontend/` → production Next.js on Cloudflare; `data/` → D1 + Vectorize. Boundary stays the same.

Each future round adds capability without rewriting what exists.

---

## 9. Open Questions for Implementation

These are punted to the implementation plan — decisions to make as we build, not blockers:

- Exact URL for the HCI Lab people page (verify during scraper build)
- Exact filename / location of the floor-plan PDF the user has
- Whether the PDF is truly vector or rasterized (determines tracer path)
- Specific Sketchfab model availability and license terms
- Floor 7 group → room assignments beyond HCI Lab (need to identify 3 other groups on floor 7)
- Tailwind vs CSS Modules vs vanilla CSS for the UI (v2 mockup is heavy CSS — easiest to translate to whichever)
