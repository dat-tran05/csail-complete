# Floor-7 3D Viz MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working first-visualization-test of CSAIL Complete: a stylized 3D Stata building with floor 7 fully rendered from real PDF-traced room polygons + real HCI Lab member data + click-room-to-fly-in interaction. Manual smoke test only; no automated tests this round.

**Architecture:** Three top-level concerns separated by folder — `pipeline/` (build data: PDF tracing + tiny scraper), `frontend/` (Next.js consumer with R3F 3D scene + Zustand UI state + API routes), `agents/` (substrate intent only — READMEs this round). Data flows one way: pipeline writes `data/*.json`, frontend API routes read them, components render.

**Tech Stack:** Bun (runtime + package manager) · Next.js 14 (app router) · TypeScript · React-Three-Fiber + drei · Zustand · Tailwind v4 · cheerio (scraper) · pdf-parse / pdf2json (PDF inspection)

**Spec:** `docs/superpowers/specs/2026-04-25-knowledge-graph-and-3d-viz-design.md`

**Aesthetic reference:** `.superpowers/brainstorm/28684-1777140090/content/floor7-render-concept-v2.html` (locked v2 mockup)

**Important deviation from spec:** Spec places API routes at `frontend/api/`. Next.js App Router requires them inside `frontend/app/api/...`. The plan uses the correct Next.js convention; the design intent is identical.

---

## File Structure (locks decomposition)

```
csail-complete/
├── pipeline/
│   ├── scrapers/
│   │   ├── README.md                  # intent doc
│   │   └── hci-lab.ts                 # ~50-line cheerio scraper
│   ├── pdf-trace/
│   │   ├── inspect.ts                 # detect vector vs raster, log structure
│   │   ├── extract-vector.ts          # SVG paths → Room[] JSON
│   │   └── trace-manual/README.md     # intent doc; built only if vector fails
│   ├── embed/README.md                # intent doc
│   └── build.ts                       # CLI router: subcommand → pipeline script
│
├── data/
│   ├── rooms-floor-7-sample.json      # COMMITTED fallback (6-room grid)
│   ├── people-fallback.json           # COMMITTED HCI seed (3 hand-typed)
│   ├── groups.json                    # COMMITTED hand-edited (4 groups)
│   ├── rooms-floor-7.json             # GITIGNORED — output of pdf-trace
│   └── people.json                    # GITIGNORED — output of scraper
│
├── agents/
│   ├── README.md
│   ├── dna/README.md
│   ├── runtime/README.md
│   └── library/README.md
│
├── shared/
│   └── schema/
│       ├── room.ts                    # Polygon, Room, RoomType
│       ├── kg.ts                      # Person, Group
│       └── dna.ts                     # placeholder export
│
├── frontend/                          # Next.js app (init via create-next-app)
│   ├── app/
│   │   ├── layout.tsx                 # global shell + fonts + metadata
│   │   ├── page.tsx                   # /  → renders <Scene/> with default state
│   │   ├── globals.css                # Tailwind + custom CSS vars for aesthetic
│   │   ├── floor/[n]/room/[id]/page.tsx  # deep-link → renders <Scene/> + preselect
│   │   └── api/
│   │       ├── kg/
│   │       │   ├── room/[id]/route.ts
│   │       │   └── floor/[n]/route.ts
│   │       └── chat/route.ts
│   ├── components/
│   │   ├── stata/
│   │   │   ├── Scene.tsx              # <Canvas> mount + lighting + scene composition
│   │   │   ├── StataExterior.tsx      # procedural building (matches v2 mockup)
│   │   │   ├── Floor.tsx              # plate + map rooms → <RoomMesh>
│   │   │   ├── RoomMesh.tsx           # extrude polygon, group color, glow on select
│   │   │   ├── CameraController.tsx   # CameraControls + derived camera target
│   │   │   └── Floor7Ring.tsx         # pulsing highlight ring on exterior
│   │   ├── cards/
│   │   │   ├── FloorCard.tsx          # default sidecar when floor entered
│   │   │   └── RoomCard.tsx           # sidecar when room selected
│   │   ├── chat/
│   │   │   └── ChatBar.tsx            # glassmorphic input, canned response
│   │   ├── graph/
│   │   │   ├── README.md              # intent
│   │   │   └── GraphPlaceholderModal.tsx  # "coming next round" dialog
│   │   └── ui/
│   │       └── MetaLabel.tsx          # top-left STATA · CSAIL · 32 chrome
│   └── lib/
│       ├── store.ts                   # Zustand UI state
│       ├── data.ts                    # filesystem loaders for data/*.json
│       └── colors.ts                  # group → color mapping
│
├── package.json                       # root: workspace config, bun scripts
├── tsconfig.base.json                 # path aliases @shared, @data
├── .gitignore                         # adds data/rooms-floor-7.json, data/people.json
└── docs/
    ├── OVERVIEW.md
    └── superpowers/{specs,plans}/...
```

**Decomposition principles applied:**

- One file = one responsibility. `Scene.tsx` mounts the canvas; `StataExterior` draws the building; `Floor` wires rooms; `RoomMesh` is a single room. Each holds easily in context.
- Data flow: `pipeline/` → `data/*.json` → `frontend/lib/data.ts` → `frontend/app/api/*` → `frontend/components/*`. One direction. No imports point upward.
- Stubbed-this-round folders contain only `README.md`. They reserve the architectural slot without scaffolding code we won't use.

---

## Tasks

### Task 1: Repo skeleton + stub READMEs + .gitignore

**Files:**
- Create: `pipeline/scrapers/README.md`
- Create: `pipeline/pdf-trace/trace-manual/README.md`
- Create: `pipeline/embed/README.md`
- Create: `agents/README.md`, `agents/dna/README.md`, `agents/runtime/README.md`, `agents/library/README.md`
- Create: `frontend/components/graph/README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p pipeline/scrapers pipeline/pdf-trace/trace-manual pipeline/embed
mkdir -p agents/dna agents/runtime agents/library
mkdir -p shared/schema data
```

- [ ] **Step 2: Write each stub README**

Each README is one paragraph. Pattern: state intent, link OVERVIEW.md component number, note "deferred this round."

`agents/README.md`:
```markdown
# agents/ — Agent Substrate

Agent DNA, runtime, and library implementations. Implements OVERVIEW.md
Components 3 (Agent Runtime / Ecosystem) and 4 (Agent DNA / DSL).

**Status:** Folder scaffolded; implementations deferred. The first viz test
(see `docs/superpowers/specs/2026-04-25-knowledge-graph-and-3d-viz-design.md`)
does not exercise this layer.

## Subdirectories
- `dna/`       — DNA spec: structured replicable system prompts with spawn/specialize instructions
- `runtime/`   — context retrieval, tool palette, orchestrator
- `library/`   — concrete agent definitions (chat-agent, briefing-agent, website-maintainer, ...)
```

`agents/dna/README.md`:
```markdown
# agents/dna/

The DSL that defines what an agent IS. See OVERVIEW.md Component 4.

**Deferred this round.** First implementations: a TypeScript schema for DNA
structure + a few example DNA files (YAML or JSON).
```

`agents/runtime/README.md`:
```markdown
# agents/runtime/

How agents execute over the knowledge graph. See OVERVIEW.md Component 3.

**Deferred this round.** First implementations: edge-based context retrieval,
tool palette (kg queries, camera commands, search), orchestrator with depth caps.
```

`agents/library/README.md`:
```markdown
# agents/library/

Concrete agent definitions. Each is a DNA file + the runtime configuration
needed to instantiate it.

**Deferred this round.** Next round: `chat-agent.ts` (the demo conversational
agent that drives camera + answers KG questions).
```

`pipeline/scrapers/README.md`:
```markdown
# pipeline/scrapers/

Source-specific scrapers that populate `data/people.json` and patch
`data/groups.json`. Each scraper runs once, locally, by hand.

**This round:** only `hci-lab.ts` (HCI Lab members → people.json).
**Future:** csail-people.ts (full directory), semantic-scholar.ts (papers),
mit-news.ts (mentions), per-group scrapers as needed.
```

`pipeline/pdf-trace/trace-manual/README.md`:
```markdown
# pipeline/pdf-trace/trace-manual/

Custom HTML tool for manually tracing room polygons from a raster floor-plan PDF.
Only built if `extract-vector.ts` cannot parse the PDF structure.

**Deferred until vector-extract is run and seen to fail.**
```

`pipeline/embed/README.md`:
```markdown
# pipeline/embed/

OpenRouter embedding generation for KG nodes (people bios, paper abstracts,
group descriptions). Outputs vectors into a SQLite DB for semantic queries.

**Deferred this round.** First viz test does not require embeddings.
```

`frontend/components/graph/README.md`:
```markdown
# frontend/components/graph/

Full UMAP graph view (toggle target of "⌘G full graph"). Will render all KG
nodes as a force-directed or UMAP-projected scatter, with selection state
synced to the 3D Stata view.

**This round:** only `GraphPlaceholderModal.tsx` — a "coming next round"
dialog that proves the toggle slot exists in the UI.
```

- [ ] **Step 3: Update .gitignore**

Append to existing `.gitignore`:

```
# Build artifacts (committed fallbacks have -sample / -fallback suffix)
data/rooms-floor-7.json
data/people.json
data/embeddings.sqlite
data/stata-model.glb

# Workspace tooling
.next
.turbo
dist
node_modules
*.tsbuildinfo
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore pipeline/ agents/ frontend/components/graph/README.md shared/ data/
git commit -m "scaffold: stub folders + READMEs for KG/viz/agents architecture"
```

---

### Task 2: Root TypeScript config + path aliases

**Files:**
- Create: `tsconfig.base.json`
- Create: `package.json` (root, minimal — frontend has its own from create-next-app later)

- [ ] **Step 1: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"],
      "@data/*": ["data/*"]
    }
  }
}
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "csail-complete",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "cd frontend && bun dev",
    "build": "cd frontend && bun run build",
    "pipeline:trace": "bun pipeline/build.ts trace-floor 7",
    "pipeline:scrape:hci": "bun pipeline/scrapers/hci-lab.ts",
    "pipeline:inspect": "bun pipeline/build.ts inspect"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 3: Install dev deps**

```bash
bun install
```

Expected: creates `bun.lockb`, installs typescript + node types.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.base.json package.json bun.lockb
git commit -m "chore: root tsconfig + bun scripts for pipeline/frontend"
```

---

### Task 3: shared/schema types

**Files:**
- Create: `shared/schema/room.ts`
- Create: `shared/schema/kg.ts`
- Create: `shared/schema/dna.ts`

- [ ] **Step 1: `shared/schema/room.ts`**

```ts
export type Polygon = [number, number][];

export type RoomType = "office" | "lab" | "conference" | "common" | "service" | "corridor";

export interface Room {
  id: string;
  number: string;
  floor: number;
  polygon: Polygon;
  type: RoomType;
  label?: string;
}
```

- [ ] **Step 2: `shared/schema/kg.ts`**

```ts
export interface Person {
  id: string;
  name: string;
  affiliation: string;
  groupIds: string[];
  roomIds: string[];
  bio?: string;
  homepage?: string;
  photoUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  shortName?: string;
  url?: string;
  roomIds: string[];
  memberIds: string[];
  color?: string;
}
```

- [ ] **Step 3: `shared/schema/dna.ts`**

```ts
export type DNA = {
  __placeholder: "agent DNA shape — defined in a future round; see agents/dna/README.md";
};
```

- [ ] **Step 4: Type-check**

```bash
bunx tsc --noEmit -p tsconfig.base.json
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add shared/schema/
git commit -m "schema: Room/Person/Group types in shared/schema"
```

---

### Task 4: Hand-edited committed seed data

**Files:**
- Create: `data/rooms-floor-7-sample.json`
- Create: `data/people-fallback.json`
- Create: `data/groups.json`

- [ ] **Step 1: `data/rooms-floor-7-sample.json` (6-room fallback grid)**

Coords are arbitrary 2D floor-plan units; R3F transforms at render. Floor-plan space: 0–1000 × 0–600 for a roughly rectangular floor.

```json
[
  {
    "id": "32-G743",
    "number": "G743",
    "floor": 7,
    "polygon": [[80,80],[380,80],[380,260],[80,260]],
    "type": "common",
    "label": "HCI Lab common"
  },
  {
    "id": "32-G748",
    "number": "G748",
    "floor": 7,
    "polygon": [[400,80],[600,80],[600,180],[400,180]],
    "type": "office",
    "label": "PL office"
  },
  {
    "id": "32-G750",
    "number": "G750",
    "floor": 7,
    "polygon": [[400,200],[600,200],[600,260],[400,260]],
    "type": "office",
    "label": "PL office"
  },
  {
    "id": "32-G755",
    "number": "G755",
    "floor": 7,
    "polygon": [[620,80],[900,80],[900,260],[620,260]],
    "type": "lab",
    "label": "Theory of Computation"
  },
  {
    "id": "32-G7-corridor",
    "number": "G7-corridor",
    "floor": 7,
    "polygon": [[80,280],[900,280],[900,320],[80,320]],
    "type": "corridor",
    "label": "Floor 7 main corridor"
  },
  {
    "id": "32-G718",
    "number": "G718",
    "floor": 7,
    "polygon": [[450,340],[800,340],[800,520],[450,520]],
    "type": "lab",
    "label": "Vision Lab"
  }
]
```

- [ ] **Step 2: `data/people-fallback.json` (HCI seed)**

```json
[
  {
    "id": "david-karger",
    "name": "David Karger",
    "affiliation": "CSAIL",
    "groupIds": ["hci-lab"],
    "roomIds": ["32-G743"],
    "homepage": "https://people.csail.mit.edu/karger/"
  },
  {
    "id": "arvind-satyanarayan",
    "name": "Arvind Satyanarayan",
    "affiliation": "CSAIL",
    "groupIds": ["hci-lab"],
    "roomIds": ["32-G743"],
    "homepage": "https://www.mit.edu/~arvindsatya/"
  },
  {
    "id": "daniel-jackson",
    "name": "Daniel Jackson",
    "affiliation": "CSAIL",
    "groupIds": ["hci-lab"],
    "roomIds": ["32-G743"],
    "homepage": "https://people.csail.mit.edu/dnj/"
  }
]
```

- [ ] **Step 3: `data/groups.json` (4 floor-7 groups)**

```json
[
  {
    "id": "hci-lab",
    "name": "User Interface Design Group (HCI Lab)",
    "shortName": "HCI",
    "url": "https://hci.csail.mit.edu/",
    "roomIds": ["32-G743"],
    "memberIds": ["david-karger", "arvind-satyanarayan", "daniel-jackson"],
    "color": "#e26b4a"
  },
  {
    "id": "csail-pl",
    "name": "Programming Languages & Verification",
    "shortName": "PL",
    "url": "https://pl.csail.mit.edu/",
    "roomIds": ["32-G748", "32-G750"],
    "memberIds": [],
    "color": "#6abf6e"
  },
  {
    "id": "theory",
    "name": "Theory of Computation",
    "shortName": "THEORY",
    "url": "https://toc.csail.mit.edu/",
    "roomIds": ["32-G755"],
    "memberIds": [],
    "color": "#a36ee2"
  },
  {
    "id": "vision",
    "name": "Vision Group",
    "shortName": "VISION",
    "url": "https://groups.csail.mit.edu/vision/",
    "roomIds": ["32-G718"],
    "memberIds": [],
    "color": "#7fb1d4"
  }
]
```

- [ ] **Step 4: Commit**

```bash
git add data/rooms-floor-7-sample.json data/people-fallback.json data/groups.json
git commit -m "data: committed seed data for floor 7 + HCI Lab fallback"
```

---

### Task 5: Pipeline CLI router

**Files:**
- Create: `pipeline/build.ts`
- Modify: `package.json` (add deps)

- [ ] **Step 1: Add pipeline deps**

```bash
bun add -D pdf-parse pdf2json cheerio @types/pdf-parse
```

- [ ] **Step 2: Write `pipeline/build.ts`**

```ts
#!/usr/bin/env bun
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
};

if (!subcommand || !(subcommand in COMMANDS)) {
  console.error("Usage: bun pipeline/build.ts <inspect|trace-floor> [args]");
  console.error("  inspect [pdf-path]                — analyze PDF structure");
  console.error("  trace-floor <n> [pdf-path]        — extract floor N rooms → data/rooms-floor-N.json");
  process.exit(1);
}

await COMMANDS[subcommand]!(args);
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/build.ts package.json bun.lockb
git commit -m "pipeline: CLI router for inspect/trace-floor subcommands"
```

---

### Task 6: PDF inspector

**Files:**
- Create: `pipeline/pdf-trace/inspect.ts`

- [ ] **Step 1: Write `inspect.ts`**

```ts
import { readFile } from "node:fs/promises";
import PdfParse from "pdf-parse";

export async function inspectPdf(path: string): Promise<void> {
  console.log(`\nInspecting: ${path}\n`);
  let buf: Buffer;
  try {
    buf = await readFile(path);
  } catch (e) {
    console.error(`Cannot read file: ${path}`);
    console.error(`Place the floor plan PDF at ${path} and re-run.`);
    process.exit(1);
  }

  const data = await PdfParse(buf);
  console.log(`Pages: ${data.numpages}`);
  console.log(`Text length (all pages): ${data.text.length} chars`);
  console.log(`Producer: ${data.info?.Producer ?? "unknown"}`);
  console.log(`Creator: ${data.info?.Creator ?? "unknown"}`);

  const sample = data.text.slice(0, 600).replace(/\s+/g, " ");
  console.log(`\nText sample:\n  ${sample}\n`);

  const looksVector = data.text.length > 500 && /\bG?\d{3,4}\b/.test(data.text);
  console.log(looksVector
    ? "→ PDF appears to contain searchable text (likely vector). Try `bun pipeline/build.ts trace-floor 7`."
    : "→ PDF text is sparse — likely raster. Vector extraction will fail; use the manual tracer fallback (see pipeline/pdf-trace/trace-manual/README.md)."
  );
}
```

- [ ] **Step 2: Smoke test (no PDF needed yet)**

```bash
bun pipeline/build.ts inspect data/nonexistent.pdf
```

Expected: clean error message instructing user to place the PDF.

- [ ] **Step 3: Commit**

```bash
git add pipeline/pdf-trace/inspect.ts
git commit -m "pipeline: PDF inspector — distinguishes vector vs raster"
```

---

### Task 7: Vector extractor (PDF → rooms-floor-N.json)

**Files:**
- Create: `pipeline/pdf-trace/extract-vector.ts`

- [ ] **Step 1: Write `extract-vector.ts`**

The pdf2json library outputs a structured JSON of all paths + text on each page. We collect closed polylines (likely room outlines), match nearby text labels (room numbers like "G743"), and emit `Room[]`.

```ts
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import PDFParser from "pdf2json";
import type { Room, Polygon, RoomType } from "../../shared/schema/room";

interface PdfText { x: number; y: number; w: number; R: { T: string }[]; }
interface PdfFill { x: number; y: number; w: number; h: number; }
interface PdfPage { Texts: PdfText[]; Fills?: PdfFill[]; HLines?: any[]; VLines?: any[]; }
interface PdfDoc { Pages: PdfPage[]; }

const ROOM_NUM_RE = /\b([A-Z]?\d{3,4}[A-Z]?)\b/;

function classify(label: string): RoomType {
  const l = label.toLowerCase();
  if (l.includes("conf")) return "conference";
  if (l.includes("lab")) return "lab";
  if (l.includes("office")) return "office";
  if (l.includes("corridor") || l.includes("hall")) return "corridor";
  if (l.includes("common") || l.includes("lounge")) return "common";
  return "office";
}

export async function extractFloor(pdfPath: string, floor: number): Promise<void> {
  if (!existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    console.error(`Place the floor-plans PDF there and re-run.`);
    console.error(`Falling back: app will use data/rooms-floor-${floor}-sample.json automatically.`);
    process.exit(1);
  }

  const parser = new PDFParser(null, true);

  const doc: PdfDoc = await new Promise((resolve, reject) => {
    parser.on("pdfParser_dataError", (err: any) => reject(err.parserError));
    parser.on("pdfParser_dataReady", (pdfData: PdfDoc) => resolve(pdfData));
    parser.loadPDF(pdfPath);
  });

  const page = doc.Pages[floor - 1];
  if (!page) {
    console.error(`PDF has no page index ${floor - 1} (floor ${floor}).`);
    console.error(`PDF has ${doc.Pages.length} pages. Adjust the page→floor mapping in extract-vector.ts.`);
    process.exit(1);
  }

  const labels = (page.Texts ?? [])
    .map((t) => ({
      x: t.x,
      y: t.y,
      text: decodeURIComponent(t.R.map((r) => r.T).join("")),
    }))
    .filter((l) => l.text.trim().length > 0);

  const fills = (page.Fills ?? []).filter((f) => f.w > 1 && f.h > 1);

  const rooms: Room[] = [];
  for (const fill of fills) {
    const poly: Polygon = [
      [fill.x, fill.y],
      [fill.x + fill.w, fill.y],
      [fill.x + fill.w, fill.y + fill.h],
      [fill.x, fill.y + fill.h],
    ];
    const cx = fill.x + fill.w / 2;
    const cy = fill.y + fill.h / 2;
    const inside = labels.find((l) =>
      l.x >= fill.x && l.x <= fill.x + fill.w &&
      l.y >= fill.y && l.y <= fill.y + fill.h
    );
    const label = inside?.text.trim() ?? "";
    const numMatch = label.match(ROOM_NUM_RE);
    if (!numMatch) continue;
    const number = numMatch[1]!;
    rooms.push({
      id: `32-${number}`,
      number,
      floor,
      polygon: poly,
      type: classify(label),
      label,
    });
  }

  if (rooms.length === 0) {
    console.error(`No rooms extracted from page ${floor}.`);
    console.error(`The PDF may be raster, or the structure differs from expected (Fills + Texts).`);
    console.error(`Inspect with: bun pipeline/build.ts inspect ${pdfPath}`);
    console.error(`If raster, build pipeline/pdf-trace/trace-manual/ — see its README.`);
    process.exit(1);
  }

  const out = `data/rooms-floor-${floor}.json`;
  await writeFile(out, JSON.stringify(rooms, null, 2));
  console.log(`Wrote ${rooms.length} rooms to ${out}`);
}
```

- [ ] **Step 2: Type-check**

```bash
bunx tsc --noEmit -p tsconfig.base.json
```

Expected: no errors.

- [ ] **Step 3: Smoke test (without PDF — should fail gracefully)**

```bash
bun pipeline/build.ts trace-floor 7
```

Expected: clean "PDF not found" error, no crash.

- [ ] **Step 4: Commit**

```bash
git add pipeline/pdf-trace/extract-vector.ts
git commit -m "pipeline: vector PDF extractor for floor-N room polygons"
```

> **Note:** When you have the actual `data/floor-plans.pdf`, run `bun pipeline/build.ts inspect data/floor-plans.pdf` first. If the inspector says "vector," run `bun pipeline/build.ts trace-floor 7`. If extraction misses rooms or finds none, the heuristic in `extract-vector.ts` (Fills as room rectangles + Texts as labels) needs adjustment based on your specific PDF's structure — or fall back to the manual tracer (deferred per spec).

---

### Task 8: HCI Lab scraper

**Files:**
- Create: `pipeline/scrapers/hci-lab.ts`

- [ ] **Step 1: Write the scraper**

```ts
#!/usr/bin/env bun
import { writeFile, readFile } from "node:fs/promises";
import { load as loadHtml } from "cheerio";
import type { Person, Group } from "../../shared/schema/kg";

const HCI_PEOPLE_URL = "https://hci.csail.mit.edu/people.html";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function scrapeHciMembers(): Promise<Person[]> {
  console.log(`Fetching ${HCI_PEOPLE_URL} ...`);
  const res = await fetch(HCI_PEOPLE_URL, { headers: { "User-Agent": "csail-complete/0.1 (contact: datt@mit.edu)" } });
  if (!res.ok) {
    throw new Error(`HCI page returned ${res.status}`);
  }
  const html = await res.text();
  const $ = loadHtml(html);

  const people: Person[] = [];
  const seen = new Set<string>();

  // Heuristic: look for elements that contain a name + link.
  // HCI page structure varies; we capture <a> tags inside likely-person containers.
  $("a").each((_, el) => {
    const $a = $(el);
    const text = $a.text().trim();
    const href = $a.attr("href") ?? "";
    if (!text || text.length < 4 || text.length > 60) return;
    if (!/^[A-Z][a-z]+(\s+[A-Z][a-z\-']+)+$/.test(text)) return; // First Last form
    const id = slugify(text);
    if (seen.has(id)) return;
    seen.add(id);
    people.push({
      id,
      name: text,
      affiliation: "CSAIL",
      groupIds: ["hci-lab"],
      roomIds: ["32-G743"],
      homepage: href.startsWith("http") ? href : (href.startsWith("/") ? `https://hci.csail.mit.edu${href}` : undefined),
    });
  });

  return people;
}

async function main() {
  let people: Person[];
  try {
    people = await scrapeHciMembers();
    if (people.length < 2) throw new Error(`Only ${people.length} members found — page format may have changed`);
    console.log(`Found ${people.length} HCI Lab members.`);
  } catch (e: any) {
    console.error(`Scraper failed: ${e.message}`);
    console.error(`Falling back to data/people-fallback.json (3 hand-typed entries).`);
    const fallback = await readFile("data/people-fallback.json", "utf-8");
    people = JSON.parse(fallback) as Person[];
  }

  await writeFile("data/people.json", JSON.stringify(people, null, 2));
  console.log(`Wrote ${people.length} people to data/people.json`);

  // Patch groups.json — update HCI Lab memberIds
  const groupsRaw = await readFile("data/groups.json", "utf-8");
  const groups = JSON.parse(groupsRaw) as Group[];
  const hci = groups.find((g) => g.id === "hci-lab");
  if (hci) {
    hci.memberIds = people.map((p) => p.id);
    await writeFile("data/groups.json", JSON.stringify(groups, null, 2));
    console.log(`Patched data/groups.json: hci-lab.memberIds now has ${hci.memberIds.length} entries`);
  }
}

await main();
```

- [ ] **Step 2: Run it**

```bash
bun pipeline/scrapers/hci-lab.ts
```

Expected: either prints "Found N HCI Lab members" + writes `data/people.json`, OR falls back cleanly to the seed file. Either way, `data/people.json` exists after.

- [ ] **Step 3: Eyeball `data/people.json`**

Open it. Confirm names look like real HCI faculty (Karger, Satyanarayan, Jackson, et al.). If the scraper pulled non-people text (e.g., "Contact Us"), tighten the regex in step 1's name pattern.

- [ ] **Step 4: Commit (scraper code only — data/people.json is gitignored)**

```bash
git add pipeline/scrapers/hci-lab.ts
git commit -m "pipeline: HCI Lab member scraper with fallback"
```

---

### Task 9: Initialize Next.js app in `frontend/`

**Files:**
- Create: `frontend/` (whole Next.js scaffold)
- Modify: `frontend/tsconfig.json` (extend root base)

- [ ] **Step 1: Run create-next-app**

```bash
bun create next-app frontend --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-bun --turbopack
```

Answer the interactive prompts: yes to TS, yes to Tailwind, yes to App Router, yes to ESLint, no to src/.

- [ ] **Step 2: Wire `frontend/tsconfig.json` to extend root base**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"],
      "@shared/*": ["../shared/*"],
      "@data/*": ["../data/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Add R3F + drei + zustand**

```bash
cd frontend && bun add three @react-three/fiber @react-three/drei zustand && bun add -D @types/three
```

- [ ] **Step 4: Verify dev server starts**

```bash
cd frontend && bun dev
```

Expected: Next.js dev server boots on `http://localhost:3000` showing the default Next.js welcome page. Kill with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add frontend/ package.json bun.lockb
git commit -m "frontend: Next.js 14 scaffold + R3F + drei + zustand"
```

---

### Task 10: Zustand UI state store

**Files:**
- Create: `frontend/lib/store.ts`

- [ ] **Step 1: Write the store**

```ts
import { create } from "zustand";

export type ViewMode = "exterior" | "floor";

interface UIState {
  view: ViewMode;
  activeFloor: number | null;
  selectedRoomId: string | null;
  hoveredRoomId: string | null;
  graphOpen: boolean;

  enterFloor: (n: number) => void;
  exitFloor: () => void;
  selectRoom: (id: string | null) => void;
  hoverRoom: (id: string | null) => void;
  setGraphOpen: (open: boolean) => void;
  reset: () => void;
}

export const useUI = create<UIState>((set) => ({
  view: "exterior",
  activeFloor: null,
  selectedRoomId: null,
  hoveredRoomId: null,
  graphOpen: false,

  enterFloor: (n) => set({ view: "floor", activeFloor: n, selectedRoomId: null }),
  exitFloor: () => set({ view: "exterior", activeFloor: null, selectedRoomId: null }),
  selectRoom: (id) => set({ selectedRoomId: id }),
  hoverRoom: (id) => set({ hoveredRoomId: id }),
  setGraphOpen: (open) => set({ graphOpen: open }),
  reset: () => set({ view: "exterior", activeFloor: null, selectedRoomId: null, hoveredRoomId: null }),
}));
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/store.ts
git commit -m "frontend: Zustand store for view/floor/selection state"
```

---

### Task 11: Data loaders + color mapping

**Files:**
- Create: `frontend/lib/data.ts`
- Create: `frontend/lib/colors.ts`

- [ ] **Step 1: `frontend/lib/colors.ts`**

```ts
export const DEFAULT_GROUP_COLORS = [
  "#e26b4a", "#6abf6e", "#a36ee2", "#7fb1d4",
  "#d4b25f", "#bf6e9e", "#5fb1a8", "#c47d4a",
];

export function colorForGroup(groupId: string, fallbackIndex = 0): string {
  return DEFAULT_GROUP_COLORS[fallbackIndex % DEFAULT_GROUP_COLORS.length]!;
}
```

- [ ] **Step 2: `frontend/lib/data.ts` — filesystem loaders**

```ts
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Room } from "@shared/schema/room";
import type { Person, Group } from "@shared/schema/kg";

const DATA_DIR = path.resolve(process.cwd(), "..", "data");

async function readJson<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, filename), "utf-8")) as T;
}

export async function loadRoomsForFloor(floor: number): Promise<Room[]> {
  const real = `rooms-floor-${floor}.json`;
  const fallback = `rooms-floor-${floor}-sample.json`;
  if (existsSync(path.join(DATA_DIR, real))) return readJson<Room[]>(real);
  if (existsSync(path.join(DATA_DIR, fallback))) return readJson<Room[]>(fallback);
  return [];
}

export async function loadPeople(): Promise<Person[]> {
  if (existsSync(path.join(DATA_DIR, "people.json"))) return readJson<Person[]>("people.json");
  return readJson<Person[]>("people-fallback.json");
}

export async function loadGroups(): Promise<Group[]> {
  return readJson<Group[]>("groups.json");
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/data.ts frontend/lib/colors.ts
git commit -m "frontend: data loaders + group color mapping"
```

---

### Task 12: API route — `/api/kg/floor/[n]`

**Files:**
- Create: `frontend/app/api/kg/floor/[n]/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { loadRoomsForFloor, loadGroups } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const floor = parseInt(n, 10);
  if (Number.isNaN(floor)) return NextResponse.json({ error: "invalid floor" }, { status: 400 });

  const rooms = await loadRoomsForFloor(floor);
  const groups = await loadGroups();

  const groupsOnFloor = groups.filter((g) => g.roomIds.some((rid) => rooms.find((r) => r.id === rid)));

  return NextResponse.json({
    floor,
    label: `32-G${floor} · Gates Tower`,
    roomCount: rooms.length,
    groupCount: groupsOnFloor.length,
    groups: groupsOnFloor.map((g) => ({ id: g.id, name: g.name, color: g.color })),
  });
}
```

- [ ] **Step 2: Smoke test the route**

```bash
cd frontend && bun dev &
sleep 3
curl -s http://localhost:3000/api/kg/floor/7 | bun -e 'console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()), null, 2))'
kill %1
```

Expected: JSON with floor, roomCount: 6, groupCount: 4, groups array.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/kg/floor/
git commit -m "frontend: GET /api/kg/floor/[n] — floor summary"
```

---

### Task 13: API route — `/api/kg/room/[id]`

**Files:**
- Create: `frontend/app/api/kg/room/[id]/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { loadRoomsForFloor, loadPeople, loadGroups } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  const groups = await loadGroups();
  const people = await loadPeople();

  // We don't know the floor up-front — try common floors.
  // For this round only floor 7 is real; loop is cheap.
  let room = null;
  for (const f of [7]) {
    const rooms = await loadRoomsForFloor(f);
    const match = rooms.find((r) => r.id === decoded);
    if (match) { room = match; break; }
  }

  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  const occupyingGroups = groups.filter((g) => g.roomIds.includes(room!.id));
  const occupants = people.filter((p) =>
    p.roomIds.includes(room!.id) || occupyingGroups.some((g) => p.groupIds.includes(g.id))
  );

  return NextResponse.json({
    room,
    groups: occupyingGroups.map((g) => ({ id: g.id, name: g.name, shortName: g.shortName, color: g.color, url: g.url })),
    members: occupants.map((p) => ({ id: p.id, name: p.name, homepage: p.homepage })),
    activity: { papersThisMonth: 2, collaborations: 4 },  // hard-coded stub per spec
  });
}
```

- [ ] **Step 2: Smoke test**

```bash
cd frontend && bun dev &
sleep 3
curl -s http://localhost:3000/api/kg/room/32-G743 | bun -e 'console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()), null, 2))'
kill %1
```

Expected: HCI Lab room with 3 occupant names (or scraped count), color #e26b4a.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/kg/room/
git commit -m "frontend: GET /api/kg/room/[id] — room detail with members"
```

---

### Task 14: API route — `/api/chat` stub

**Files:**
- Create: `frontend/app/api/chat/route.ts`

- [ ] **Step 1: Write the stub**

```ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { message } = await req.json().catch(() => ({ message: "" }));
  return NextResponse.json({
    echo: message,
    reply: "Chat agent coming next round — for now, click rooms directly to explore.",
  });
}
```

- [ ] **Step 2: Smoke test**

```bash
cd frontend && bun dev &
sleep 3
curl -s -X POST http://localhost:3000/api/chat -H 'content-type: application/json' -d '{"message":"who works in HCI?"}'
kill %1
```

Expected: JSON with echo + canned reply.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/chat/
git commit -m "frontend: POST /api/chat — visual stub with canned reply"
```

---

### Task 15: 3D Scene — Canvas mount + lighting

**Files:**
- Create: `frontend/components/stata/Scene.tsx`

- [ ] **Step 1: Write Scene.tsx**

```tsx
"use client";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { StataExterior } from "./StataExterior";
import { Floor } from "./Floor";
import { CameraController } from "./CameraController";
import { Floor7Ring } from "./Floor7Ring";
import { useUI } from "@/lib/store";

interface SceneProps {
  rooms: import("@shared/schema/room").Room[];
  groups: import("@shared/schema/kg").Group[];
}

export function Scene({ rooms, groups }: SceneProps) {
  const view = useUI((s) => s.view);

  return (
    <Canvas
      shadows
      camera={{ position: [12, 8, 18], fov: 45 }}
      gl={{ antialias: true }}
      style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#060812 0%,#101a30 35%,#1a2548 70%,#0d121f 100%)" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.35} color="#7090b0" />
        <directionalLight position={[10, 18, 6]} intensity={0.9} color="#fff5dc" castShadow />
        <pointLight position={[-8, 6, -4]} intensity={0.6} color="#a36ee2" />

        <fog attach="fog" args={["#0d121f", 30, 80]} />

        <StataExterior dimmed={view === "floor"} />
        <Floor7Ring />
        {view === "floor" && <Floor rooms={rooms} groups={groups} level={7} />}

        <CameraController rooms={rooms} />

        <Environment preset="night" background={false} />
      </Suspense>
    </Canvas>
  );
}
```

- [ ] **Step 2: Commit (will fail to build until child components exist — that's expected; we build them next)**

Skip commit; we'll commit at the end of Task 18 when the scene renders.

---

### Task 16: Procedural Stata exterior

**Files:**
- Create: `frontend/components/stata/StataExterior.tsx`

- [ ] **Step 1: Write StataExterior.tsx**

Procedural sketch matching the v2 mockup: opposing tower lean, gradient materials simulated via emissive, brick base, amphitheater pavilion.

```tsx
"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props { dimmed?: boolean; }

export function StataExterior({ dimmed = false }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const opacity = dimmed ? 0.3 : 1.0;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // smooth opacity transition via material
    groupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material && "opacity" in obj.material) {
        const m = obj.material as THREE.MeshStandardMaterial;
        m.transparent = true;
        m.opacity = THREE.MathUtils.damp(m.opacity, opacity, 4, delta);
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* brick base */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 1, 8]} />
        <meshStandardMaterial color="#4a2415" roughness={0.95} />
      </mesh>

      {/* Gates tower — yellow, leans left */}
      <group position={[-3.2, 0, 0]} rotation={[0, 0, 0.08]}>
        <mesh position={[0, 5, 0]} castShadow>
          <boxGeometry args={[2.6, 9, 2.4]} />
          <meshStandardMaterial color="#c9a444" emissive="#a07820" emissiveIntensity={0.15} roughness={0.4} metalness={0.25} />
        </mesh>
        {/* lit windows scattered */}
        {[2, 3.5, 5, 6.2, 7.5].map((y, i) => (
          <mesh key={i} position={[1.31, y, (i % 2 ? 0.4 : -0.4)]} >
            <planeGeometry args={[0.4, 0.3]} />
            <meshBasicMaterial color="#ffd28a" toneMapped={false} />
          </mesh>
        ))}
        {/* roof cylinder */}
        <mesh position={[0, 10, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 1.4, 16]} />
          <meshStandardMaterial color="#bcbfc7" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Dreyfoos tower — silver, leans right */}
      <group position={[2.0, 0, -0.3]} rotation={[0, 0.1, -0.07]}>
        <mesh position={[0, 4.5, 0]} castShadow>
          <boxGeometry args={[2.8, 8, 2.6]} />
          <meshStandardMaterial color="#9aa0b0" emissive="#3a3e48" emissiveIntensity={0.1} roughness={0.35} metalness={0.55} />
        </mesh>
        {[2.2, 3.6, 5, 6.4].map((y, i) => (
          <mesh key={i} position={[1.41, y, (i % 2 ? 0.4 : -0.4)]} >
            <planeGeometry args={[0.4, 0.3]} />
            <meshBasicMaterial color="#ffd28a" toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* amphitheater pavilion */}
      <mesh position={[5, 1.4, 0.5]} rotation={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[3, 1.8, 3.5]} />
        <meshStandardMaterial color="#8a6440" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Cambridge skyline silhouette far away */}
      <group position={[0, 0, -25]}>
        {Array.from({ length: 14 }).map((_, i) => {
          const x = (i - 7) * 3.5;
          const h = 1.5 + (Math.sin(i * 1.7) + 1) * 1.5;
          return (
            <mesh key={i} position={[x, h / 2, 0]}>
              <boxGeometry args={[2.2, h, 0.5]} />
              <meshBasicMaterial color="#0a0e1a" />
            </mesh>
          );
        })}
      </group>

      {/* ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0d111e" roughness={1.0} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Commit (still can't build until siblings exist)**

Skip commit; bundling at Task 18.

---

### Task 17: Floor + RoomMesh + Floor7Ring

**Files:**
- Create: `frontend/components/stata/Floor.tsx`
- Create: `frontend/components/stata/RoomMesh.tsx`
- Create: `frontend/components/stata/Floor7Ring.tsx`

- [ ] **Step 1: `RoomMesh.tsx`**

Extrudes a polygon into a low-walled room. Color from owning group. Glow on hover/select.

```tsx
"use client";
import { useMemo } from "react";
import * as THREE from "three";
import type { Room } from "@shared/schema/room";
import { useUI } from "@/lib/store";

interface Props {
  room: Room;
  color: string;
  worldOffset: [number, number];
  scale: number;
}

export function RoomMesh({ room, color, worldOffset, scale }: Props) {
  const selectedId = useUI((s) => s.selectedRoomId);
  const hoveredId = useUI((s) => s.hoveredRoomId);
  const selectRoom = useUI((s) => s.selectRoom);
  const hoverRoom = useUI((s) => s.hoverRoom);

  const isSelected = selectedId === room.id;
  const isHovered = hoveredId === room.id;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    room.polygon.forEach(([x, y], i) => {
      const wx = (x - worldOffset[0]) * scale;
      const wy = (y - worldOffset[1]) * scale;
      if (i === 0) s.moveTo(wx, wy);
      else s.lineTo(wx, wy);
    });
    s.closePath();
    return s;
  }, [room.polygon, worldOffset, scale]);

  const baseColor = new THREE.Color(color);
  const intensity = isSelected ? 1.0 : isHovered ? 0.5 : 0.18;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); hoverRoom(room.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); hoverRoom(null); document.body.style.cursor = "default"; }}
        onClick={(e) => { e.stopPropagation(); selectRoom(room.id); }}
      >
        <extrudeGeometry args={[shape, { depth: 0.25, bevelEnabled: false }]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={intensity}
          transparent
          opacity={0.85}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: `Floor.tsx`**

```tsx
"use client";
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import type { Room } from "@shared/schema/room";
import type { Group } from "@shared/schema/kg";
import { RoomMesh } from "./RoomMesh";
import { DEFAULT_GROUP_COLORS } from "@/lib/colors";

interface Props {
  rooms: Room[];
  groups: Group[];
  level: number;
}

const FLOOR_HEIGHT = 1.0;        // world Y per floor level
const RENDER_HEIGHT_OFFSET = 0.5;

export function Floor({ rooms, groups, level }: Props) {
  const { worldOffset, scale } = useMemo(() => {
    if (rooms.length === 0) return { worldOffset: [0, 0] as [number, number], scale: 0.012 };
    const xs = rooms.flatMap((r) => r.polygon.map(([x]) => x));
    const ys = rooms.flatMap((r) => r.polygon.map(([, y]) => y));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY);
    const TARGET_WIDTH = 12;
    return { worldOffset: [cx, cy] as [number, number], scale: TARGET_WIDTH / span };
  }, [rooms]);

  const colorByRoom = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g, i) => {
      const c = g.color ?? DEFAULT_GROUP_COLORS[i % DEFAULT_GROUP_COLORS.length]!;
      g.roomIds.forEach((rid) => map.set(rid, c));
    });
    return map;
  }, [groups]);

  return (
    <group position={[0, level * FLOOR_HEIGHT + RENDER_HEIGHT_OFFSET, 0]}>
      {/* floor plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#1a2238" roughness={0.95} />
      </mesh>

      {rooms.map((room) => (
        <group key={room.id}>
          <RoomMesh
            room={room}
            color={colorByRoom.get(room.id) ?? "#6688aa"}
            worldOffset={worldOffset}
            scale={scale}
          />
          <Text
            position={[
              (room.polygon.reduce((a, [x]) => a + x, 0) / room.polygon.length - worldOffset[0]) * scale,
              0.4,
              -(room.polygon.reduce((a, [, y]) => a + y, 0) / room.polygon.length - worldOffset[1]) * scale,
            ]}
            fontSize={0.18}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {room.number}
          </Text>
        </group>
      ))}
    </group>
  );
}
```

- [ ] **Step 3: `Floor7Ring.tsx`** — pulsing highlight ring on the exterior

```tsx
"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUI } from "@/lib/store";

export function Floor7Ring() {
  const ref = useRef<THREE.Mesh>(null);
  const view = useUI((s) => s.view);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = view === "exterior" ? 0.4 + Math.sin(t * 1.5) * 0.25 : 0;
  });

  // ring around floor 7 height (~7.0 world units)
  return (
    <mesh ref={ref} position={[-0.3, 7, 0]} rotation={[0, 0, 0]}>
      <ringGeometry args={[3.8, 4.2, 48]} />
      <meshBasicMaterial color="#ffd28a" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}
```

- [ ] **Step 4: Commit (deferred to Task 18)**

Skip; bundling at Task 18.

---

### Task 18: Camera controller + scene wiring

**Files:**
- Create: `frontend/components/stata/CameraController.tsx`

- [ ] **Step 1: Write CameraController.tsx**

Uses drei `<CameraControls>` ref + watches store to animate position/lookAt on view changes.

```tsx
"use client";
import { useRef, useEffect } from "react";
import { CameraControls } from "@react-three/drei";
import type { Room } from "@shared/schema/room";
import { useUI } from "@/lib/store";

interface Props { rooms: Room[]; }

export function CameraController({ rooms }: Props) {
  const ref = useRef<CameraControls | null>(null);
  const view = useUI((s) => s.view);
  const selectedRoomId = useUI((s) => s.selectedRoomId);

  useEffect(() => {
    if (!ref.current) return;
    if (view === "exterior") {
      ref.current.setLookAt(12, 8, 18, 0, 4, 0, true);
      return;
    }
    if (view === "floor" && !selectedRoomId) {
      ref.current.setLookAt(0, 14, 8, 0, 7.5, 0, true);
      return;
    }
    if (view === "floor" && selectedRoomId) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (!room) return;
      // we don't have world coords here without computing from polygon — approximate using centroid
      const cx = room.polygon.reduce((a, [x]) => a + x, 0) / room.polygon.length;
      const cy = room.polygon.reduce((a, [, y]) => a + y, 0) / room.polygon.length;
      // map floor-plan coords to world: rough — Floor.tsx handles transform; here we just zoom in vertically
      void cx; void cy;
      ref.current.setLookAt(2, 10, 6, 0, 7.5, 0, true);
    }
  }, [view, selectedRoomId, rooms]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.6} />;
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: no errors. Fix any import or type issues now.

- [ ] **Step 3: Commit the entire 3D scene chunk (Tasks 15–18)**

```bash
git add frontend/components/stata/
git commit -m "frontend: 3D scene — Stata exterior + Floor 7 + camera + ring"
```

---

### Task 19: Sidecar cards (Floor + Room)

**Files:**
- Create: `frontend/components/cards/FloorCard.tsx`
- Create: `frontend/components/cards/RoomCard.tsx`

- [ ] **Step 1: `FloorCard.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface FloorSummary {
  floor: number;
  label: string;
  roomCount: number;
  groupCount: number;
  groups: { id: string; name: string; color?: string }[];
}

export function FloorCard() {
  const view = useUI((s) => s.view);
  const activeFloor = useUI((s) => s.activeFloor);
  const exitFloor = useUI((s) => s.exitFloor);
  const [data, setData] = useState<FloorSummary | null>(null);

  useEffect(() => {
    if (view !== "floor" || activeFloor == null) { setData(null); return; }
    fetch(`/api/kg/floor/${activeFloor}`).then((r) => r.json()).then(setData).catch(() => setData(null));
  }, [view, activeFloor]);

  if (view !== "floor" || !data) return null;

  return (
    <div className="absolute top-16 right-4 w-[180px] bg-[rgba(10,12,22,0.96)] backdrop-blur-md border border-[rgba(140,160,200,0.22)] rounded-lg p-3 text-xs shadow-2xl z-30">
      <div className="text-[#a8b8d0] tracking-widest text-[9px] mb-2">FLOOR {data.floor}</div>
      <div className="text-white font-semibold text-sm mb-1">{data.label}</div>
      <div className="text-[#7a8aa0] text-[10px] mb-3">{data.roomCount} rooms · {data.groupCount} groups</div>
      <div className="text-[#a0b0c8] text-[8px] tracking-widest mb-2 uppercase">Groups</div>
      <div className="space-y-1">
        {data.groups.map((g) => (
          <div key={g.id} className="flex items-center gap-2 text-[#d0d8e4] text-[10px]">
            <span className="w-2 h-2 rounded-full" style={{ background: g.color, boxShadow: `0 0 4px ${g.color}` }} />
            {g.name}
          </div>
        ))}
      </div>
      <button onClick={exitFloor} className="mt-3 text-[#7a8aa0] text-[10px] hover:text-white transition">← back to building</button>
    </div>
  );
}
```

- [ ] **Step 2: `RoomCard.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface RoomDetail {
  room: { id: string; number: string; floor: number; type: string; label?: string };
  groups: { id: string; name: string; shortName?: string; color?: string; url?: string }[];
  members: { id: string; name: string; homepage?: string }[];
  activity: { papersThisMonth: number; collaborations: number };
}

export function RoomCard() {
  const selectedRoomId = useUI((s) => s.selectedRoomId);
  const selectRoom = useUI((s) => s.selectRoom);
  const [data, setData] = useState<RoomDetail | null>(null);

  useEffect(() => {
    if (!selectedRoomId) { setData(null); return; }
    fetch(`/api/kg/room/${encodeURIComponent(selectedRoomId)}`).then((r) => r.json()).then(setData).catch(() => setData(null));
  }, [selectedRoomId]);

  if (!selectedRoomId || !data) return null;
  const primaryGroup = data.groups[0];
  const accentColor = primaryGroup?.color ?? "#7faec7";

  return (
    <div className="absolute top-16 right-4 w-[200px] bg-[rgba(10,12,22,0.96)] backdrop-blur-md border border-[rgba(140,160,200,0.22)] rounded-lg p-4 text-xs shadow-2xl z-30" style={{ boxShadow: `0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px ${accentColor}33` }}>
      <span className="inline-block px-2 py-0.5 rounded text-[8px] tracking-widest font-semibold mb-2" style={{ background: `${accentColor}33`, color: accentColor }}>
        {primaryGroup?.shortName ?? "ROOM"} · {data.room.id}
      </span>
      <div className="text-white text-sm font-semibold leading-tight mb-1">{primaryGroup?.name ?? data.room.label ?? data.room.number}</div>
      <div className="text-[#7a8aa0] text-[9px] mb-3 font-mono">Floor {data.room.floor} · {data.room.type}</div>

      {data.members.length > 0 && (
        <div className="mb-3">
          <div className="text-[#a0b0c8] text-[8px] tracking-widest uppercase mb-1.5">Members</div>
          {data.members.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-[#d0d8e4] text-[10px] py-0.5">
              <span className="w-1 h-1 rounded-full bg-[#ffd28a] shadow-[0_0_4px_#ffd28a]" />
              {m.homepage ? <a href={m.homepage} target="_blank" rel="noopener" className="hover:text-white">{m.name}</a> : m.name}
            </div>
          ))}
          {data.members.length > 5 && <div className="text-[#7a8aa0] text-[9px] mt-1">+{data.members.length - 5} more</div>}
        </div>
      )}

      <div className="text-[#7a8aa0] text-[9px] italic pt-2 border-t border-[rgba(140,160,200,0.12)]">
        {data.activity.papersThisMonth} papers this month · {data.activity.collaborations} collaborations
      </div>

      <button onClick={() => selectRoom(null)} className="mt-3 text-[#7a8aa0] text-[10px] hover:text-white transition">close</button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/cards/
git commit -m "frontend: FloorCard + RoomCard sidecars"
```

---

### Task 20: ChatBar + GraphPlaceholderModal + MetaLabel

**Files:**
- Create: `frontend/components/chat/ChatBar.tsx`
- Create: `frontend/components/graph/GraphPlaceholderModal.tsx`
- Create: `frontend/components/ui/MetaLabel.tsx`

- [ ] **Step 1: `ChatBar.tsx`**

```tsx
"use client";
import { useState } from "react";

export function ChatBar() {
  const [value, setValue] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: value }) });
    const data = await res.json();
    setReply(data.reply);
    setValue("");
  };

  return (
    <div className="absolute bottom-4 left-4 right-44 z-30">
      {reply && (
        <div className="mb-2 bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.18)] rounded-md px-3 py-2 text-[10px] text-[#a8b8d0]">
          {reply}
        </div>
      )}
      <form onSubmit={submit} className="bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.18)] rounded-md flex items-center px-3 py-2 shadow-xl">
        <span className="text-[#5a78a0] font-mono text-xs mr-2">›</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask CSAIL anything…"
          className="flex-1 bg-transparent outline-none text-[#d0d8e4] text-[11px] font-mono placeholder-[#7a8aa0]"
        />
      </form>
    </div>
  );
}
```

- [ ] **Step 2: `GraphPlaceholderModal.tsx`**

```tsx
"use client";
import { useUI } from "@/lib/store";

export function GraphPlaceholderModal() {
  const open = useUI((s) => s.graphOpen);
  const setOpen = useUI((s) => s.setGraphOpen);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-[rgba(10,12,22,0.96)] border border-[rgba(140,160,200,0.22)] rounded-lg p-8 max-w-md text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-[#ffd28a] tracking-widest text-[10px] mb-3">FULL GRAPH VIEW</div>
        <div className="text-white text-lg font-semibold mb-2">Coming next round</div>
        <div className="text-[#a8b8d0] text-sm mb-6">
          The abstract UMAP graph view of all CSAIL nodes will live here. State slot is wired —
          implementation lands when scrapers cover all groups + embeddings exist.
        </div>
        <button onClick={() => setOpen(false)} className="text-[#7a8aa0] text-xs hover:text-white transition">close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `MetaLabel.tsx` + global keyboard hook**

```tsx
"use client";
import { useEffect } from "react";
import { useUI } from "@/lib/store";

export function MetaLabel() {
  const view = useUI((s) => s.view);
  const activeFloor = useUI((s) => s.activeFloor);
  const setGraphOpen = useUI((s) => s.setGraphOpen);
  const exitFloor = useUI((s) => s.exitFloor);
  const selectRoom = useUI((s) => s.selectRoom);
  const selectedRoomId = useUI((s) => s.selectedRoomId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setGraphOpen(true);
        return;
      }
      if (e.key === "Escape") {
        if (selectedRoomId) selectRoom(null);
        else if (view === "floor") exitFloor();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, selectedRoomId, setGraphOpen, exitFloor, selectRoom]);

  return (
    <div className="absolute top-4 left-4 z-30 text-[10px] tracking-widest font-mono text-[rgba(180,195,220,0.6)]">
      {view === "exterior"
        ? <><span className="text-[#e8d8b8] tracking-[0.2em]">STATA</span> · CSAIL · 32</>
        : <><span className="text-[#e8d8b8] tracking-[0.2em]">FLOOR {activeFloor}</span> · 32-G{activeFloor} · GATES</>
      }
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/chat/ frontend/components/graph/GraphPlaceholderModal.tsx frontend/components/ui/
git commit -m "frontend: chat bar + graph modal + meta label + keyboard shortcuts"
```

---

### Task 21: Wire it all into `frontend/app/page.tsx`

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Replace `frontend/app/page.tsx`**

```tsx
import { Scene } from "@/components/stata/Scene";
import { FloorCard } from "@/components/cards/FloorCard";
import { RoomCard } from "@/components/cards/RoomCard";
import { ChatBar } from "@/components/chat/ChatBar";
import { GraphPlaceholderModal } from "@/components/graph/GraphPlaceholderModal";
import { MetaLabel } from "@/components/ui/MetaLabel";
import { GraphToggle } from "@/components/ui/GraphToggle";
import { EnterFloor7Trigger } from "@/components/ui/EnterFloor7Trigger";
import { loadRoomsForFloor, loadGroups } from "@/lib/data";

export default async function Home() {
  const rooms = await loadRoomsForFloor(7);
  const groups = await loadGroups();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      <Scene rooms={rooms} groups={groups} />
      <MetaLabel />
      <GraphToggle />
      <EnterFloor7Trigger />
      <FloorCard />
      <RoomCard />
      <ChatBar />
      <GraphPlaceholderModal />
    </main>
  );
}
```

- [ ] **Step 2: Add `frontend/components/ui/GraphToggle.tsx`**

```tsx
"use client";
import { useUI } from "@/lib/store";

export function GraphToggle() {
  const setGraphOpen = useUI((s) => s.setGraphOpen);
  return (
    <button
      onClick={() => setGraphOpen(true)}
      className="absolute bottom-4 right-4 z-30 bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.25)] px-3 py-2 rounded-md text-[11px] text-[#a8b8d0] font-mono hover:text-white transition"
    >
      ⌘G  full graph
    </button>
  );
}
```

- [ ] **Step 3: Add `frontend/components/ui/EnterFloor7Trigger.tsx`**

A small button that says "Enter Floor 7" in the exterior view (since clicking the building model in 3D is fragile — this gives a guaranteed entry path).

```tsx
"use client";
import { useUI } from "@/lib/store";

export function EnterFloor7Trigger() {
  const view = useUI((s) => s.view);
  const enterFloor = useUI((s) => s.enterFloor);
  if (view !== "exterior") return null;
  return (
    <button
      onClick={() => enterFloor(7)}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-[rgba(255,210,138,0.12)] backdrop-blur-md border border-[rgba(255,210,138,0.5)] px-5 py-2.5 rounded-md text-xs text-[#ffd28a] font-mono hover:bg-[rgba(255,210,138,0.2)] hover:text-white transition tracking-widest"
    >
      ENTER FLOOR 7
    </button>
  );
}
```

- [ ] **Step 4: `frontend/app/globals.css`** — append (don't replace Tailwind imports)

```css
html, body { background: #060812; color: white; overflow: hidden; }
* { box-sizing: border-box; }
```

- [ ] **Step 5: Update `frontend/app/layout.tsx` metadata**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSAIL Complete · Floor 7",
  description: "A living graph of CSAIL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Run dev server, eyeball**

```bash
cd frontend && bun dev
```

Open http://localhost:3000. Expected:
- Stylized Stata exterior visible
- Top-left "STATA · CSAIL · 32" label
- Pulsing "ENTER FLOOR 7" button center-screen
- "⌘G full graph" button bottom-right
- Chat bar bottom-left

Click "ENTER FLOOR 7":
- Camera flies in
- Stata fades to ~30%
- Floor 7 plate fades in with all rooms
- FloorCard appears top-right showing "Floor 7 · 6 rooms · 4 groups"

Click HCI Lab room:
- Room glows
- RoomCard appears showing HCI Lab + members from people.json

Press Esc:
- RoomCard closes (or floor exits if no room selected)

Press ⌘G:
- Modal "Coming next round"

- [ ] **Step 7: Commit**

```bash
git add frontend/app/ frontend/components/ui/
git commit -m "frontend: wire full scene + UI chrome + entry trigger + keyboard"
```

---

### Task 22: Deep-link route — `/floor/[n]/room/[id]`

**Files:**
- Create: `frontend/app/floor/[n]/room/[id]/page.tsx`
- Create: `frontend/components/ui/DeepLinkInitializer.tsx`

- [ ] **Step 1: `DeepLinkInitializer.tsx`**

```tsx
"use client";
import { useEffect } from "react";
import { useUI } from "@/lib/store";

interface Props { floor: number; roomId: string; }

export function DeepLinkInitializer({ floor, roomId }: Props) {
  const enterFloor = useUI((s) => s.enterFloor);
  const selectRoom = useUI((s) => s.selectRoom);
  useEffect(() => {
    enterFloor(floor);
    setTimeout(() => selectRoom(roomId), 300);
  }, [floor, roomId, enterFloor, selectRoom]);
  return null;
}
```

- [ ] **Step 2: Deep-link page**

```tsx
import { Scene } from "@/components/stata/Scene";
import { FloorCard } from "@/components/cards/FloorCard";
import { RoomCard } from "@/components/cards/RoomCard";
import { ChatBar } from "@/components/chat/ChatBar";
import { GraphPlaceholderModal } from "@/components/graph/GraphPlaceholderModal";
import { MetaLabel } from "@/components/ui/MetaLabel";
import { GraphToggle } from "@/components/ui/GraphToggle";
import { DeepLinkInitializer } from "@/components/ui/DeepLinkInitializer";
import { loadRoomsForFloor, loadGroups } from "@/lib/data";

export default async function DeepLinkPage({ params }: { params: Promise<{ n: string; id: string }> }) {
  const { n, id } = await params;
  const floor = parseInt(n, 10);
  const roomId = decodeURIComponent(id);
  const rooms = await loadRoomsForFloor(floor);
  const groups = await loadGroups();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      <Scene rooms={rooms} groups={groups} />
      <MetaLabel />
      <GraphToggle />
      <FloorCard />
      <RoomCard />
      <ChatBar />
      <GraphPlaceholderModal />
      <DeepLinkInitializer floor={floor} roomId={roomId} />
    </main>
  );
}
```

- [ ] **Step 3: Smoke test**

```bash
cd frontend && bun dev
```

Open `http://localhost:3000/floor/7/room/32-G743`. Expected: app loads with floor 7 entered AND HCI Lab pre-selected, sidecar visible.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/floor/ frontend/components/ui/DeepLinkInitializer.tsx
git commit -m "frontend: deep-link route /floor/[n]/room/[id] with state preselect"
```

---

### Task 23: Final 9-step verification

This task runs the full smoke test from the spec. Fix anything broken.

- [ ] **Step 1: Run extract (will fail without PDF — that's OK, fallback kicks in)**

```bash
bun pipeline/build.ts trace-floor 7
```

Expected: either succeeds (writes `data/rooms-floor-7.json`) or prints "PDF not found." Either is fine — the app will use the sample fallback when the real file is missing.

- [ ] **Step 2: Run scraper**

```bash
bun pipeline/scrapers/hci-lab.ts
```

Expected: writes `data/people.json`. If the HCI page format changed and 0 members are scraped, fallback fires automatically.

- [ ] **Step 3: Start dev server**

```bash
cd frontend && bun dev
```

Expected: starts on :3000 with no console errors.

- [ ] **Step 4: Manual browser check — exterior view**

Open `http://localhost:3000`. Verify:
- [ ] Stylized Stata visible (two leaning towers, brick base, amphitheater, distant skyline)
- [ ] "STATA · CSAIL · 32" label top-left
- [ ] "ENTER FLOOR 7" button visible center
- [ ] "⌘G full graph" button bottom-right
- [ ] Chat bar bottom-left says "Ask CSAIL anything…"
- [ ] Floor-7 ring pulses (subtle glow oscillation)
- [ ] No console errors

- [ ] **Step 5: Manual browser check — enter floor 7**

Click "ENTER FLOOR 7":
- [ ] Camera flies in smoothly (~600ms)
- [ ] Stata exterior fades to dimmer state
- [ ] Floor 7 plate visible with 6 colored rooms (assuming sample data)
- [ ] Room labels (G743, G748, etc.) readable
- [ ] FloorCard top-right showing "Floor 7 · 6 rooms · 4 groups"
- [ ] HCI Lab listed in groups with orange dot

- [ ] **Step 6: Manual browser check — select HCI Lab**

Hover orange room → cursor becomes pointer, room brightens. Click:
- [ ] Room glows brighter
- [ ] RoomCard replaces FloorCard, showing "HCI" tag, full group name, member list
- [ ] Members are the real HCI Lab faculty (from scraper or fallback)
- [ ] Sidecar accent border in orange

- [ ] **Step 7: Manual browser check — keyboard + back**

- [ ] Press Esc once → RoomCard closes, FloorCard returns
- [ ] Press Esc again → returns to exterior, ring resumes pulsing
- [ ] Press ⌘G (or Ctrl+G on non-Mac) → "Coming next round" modal appears
- [ ] Click outside modal → closes

- [ ] **Step 8: Manual browser check — deep link**

Open `http://localhost:3000/floor/7/room/32-G743` directly in a new tab:
- [ ] App loads in floor view with HCI Lab pre-selected, no clicks needed

- [ ] **Step 9: If any item fails — fix it**

Common issues:
- Camera doesn't move smoothly → check `smoothTime` on `<CameraControls>`, ensure `setLookAt(..., true)` (the `true` enables animation).
- Room polygons look wrong → check that `Floor.tsx` is centering on the right `worldOffset` and the scale calculation handles your data extents.
- HCI Lab card empty → run `bun pipeline/scrapers/hci-lab.ts` again; check `data/people.json`.
- API 404 on room → URL-encode the colon in `32-G743` (browser does this automatically; server `decodeURIComponent`s).

- [ ] **Step 10: Commit any fixes**

```bash
git add -p   # review what's staged
git commit -m "fix: <whatever needed fixing during verification>"
```

If nothing needed fixing, no commit.

---

## Out of Scope (do NOT build in this plan)

- Chat → KG tool use; chat is a stub
- Full UMAP graph view; modal placeholder only
- Agent DNA / runtime / library implementations
- Embeddings, semantic search
- Scraping beyond HCI Lab
- Floors other than 7
- Cloudflare deployment
- SQLite (JSON files suffice)
- Authentication, persistence beyond local files
- Mobile / projector legibility tuning
- Sketchfab model integration (procedural exterior is the chosen path; Sketchfab is a future enhancement to swap into `<StataExterior>`)
- Automated tests (manual smoke test only this round)

---

## Spec Coverage Self-Review

Mapping each spec section → tasks that implement it:

| Spec section | Tasks |
|---|---|
| §3 Folder layout | Task 1 (skeleton), Task 9 (frontend init) |
| §4 Data model — `room.ts`, `kg.ts`, `dna.ts` | Task 3 |
| §4 Data artifacts — committed seeds | Task 4 |
| §5 PDF tracing pipeline (vector-first) | Tasks 5, 6, 7 |
| §5 HCI Lab scraper | Task 8 |
| §5 3D Stata model — procedural fallback | Task 16 |
| §5 Floor 7 rendering | Tasks 17, 18 |
| §6 Interaction flow (1–7) | Tasks 18, 19, 20, 21 |
| §6 State management (Zustand) | Task 10 |
| §6 Sidecar cards | Task 19 |
| §6 Chat panel (visual stub) | Task 20 |
| §6 Graceful degradation (fallbacks) | Tasks 4, 8, 11 |
| §6 Verification checklist (9 steps) | Task 23 |
| §6 Deep-link URL | Task 22 |

Gaps: none identified.
