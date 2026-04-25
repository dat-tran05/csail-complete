# CSAIL Complete — Components & Research Plan

A working planning doc. Each component below is scoped so one or two people can own it and research independently. Open questions are research prompts, not blockers — start sketching answers in parallel.

---

## One-paragraph framing

We're generating a living graph of CSAIL — every person, group, paper, project, and the relationships among them. The graph is **inspectable** (zoom into any node), **relational** (analyze across multiple nodes), and **alive** (kept current by background agents). Layered on top is an **agent ecosystem**: agents that connect via edges to the specific info nodes they need for a given task, gather context properly, and operate over the graph. Underneath the ecosystem is the **agent DNA / DSL** — the language and protocol by which agents inherit, specialize, and spawn. The product is the graph + the agents that live in it. Use cases — pre-meeting briefings, "who should I talk to," weekly digests, group-website maintainers, long-running autoresearch — are features inside this substrate, not separate apps.

---

## Architecture, in layers

1. **Information graph** — nodes (people, groups, papers, projects) + typed edges (authored, member-of, advises, collaborates-with, etc.).
2. **Surface / visualization** — the map, profile cards, multi-node analysis views, search, chat entry point.
3. **Agent runtime / ecosystem** — agent state, context-fetching via edges, orchestrator/worker patterns, tool distribution.
4. **Agent DNA / DSL** — the spawning + specialization protocol, discovery, communication.
5. **Use cases / features** — visible agents that operate on top of the runtime (briefings, group-website agent, autoresearch, etc.).
6. **Pitch + demo choreography** — narrative, rehearsal, pre-caching, recursion visualization.

Components 1–4 are roughly the engineering stack, in dependency order. Component 5 sits on top of all of them. Component 6 runs in parallel from day one.

---

## Component 1 — Knowledge Graph (Substrate)

**Goal:** A queryable, current graph of CSAIL with enough depth to ground every demo.

**In scope:**

- Node types: Person, Group, Paper, Project. Maybe: Course, Seminar, Lab/Building.
- Edge types: authored, advises, member-of, collaborates-with, cites, mentioned-in.
- Sources: csail.mit.edu/people, Semantic Scholar, arxiv, public GitHub, MIT News, group websites.
- Storage: D1 (structured) + Vectorize (embeddings) on Cloudflare. Reasoning for both: structured queries on the graph, semantic queries on text.
- Freshness: nightly sweepers that diff against last snapshot, surface changes as PRs / events.

**Open questions:**

- What's the right schema granularity? (Should a Project be a first-class node, or an attribute of Person + Paper?)
- How deep should each profile go? (Bio + last 5 papers + collaborators is the floor. Are reading lists, advisees, course history worth it for the demo?)
- What's the dedup / disambiguation strategy for people with common names or multiple affiliations?
- Embedding strategy: per-paper, per-person, per-group? What gets indexed for what kinds of queries?

**Dependencies:** none upstream. Everything else depends on this.

**MVP vs stretch:**

- MVP: 200+ people, current, with bios + recent papers + co-authorship edges.
- Stretch: 900+ people, deeper enrichment, advisor/advisee edges, project-level nodes, course history.

---

## Component 2 — Visualization & Interaction Layer (Surface)

**Goal:** The map and the cards that make CSAIL feel knowable. This component does ~40% of the demo work.

**In scope:**

- The map: UMAP-projected layout, nodes colored by group, searchable, performant (<500ms feel).
- Profile cards: per-person, per-group, per-paper. Scannable. Cited.
- Multi-node analysis view: pick 2+ nodes, see relationships, overlap, gaps.
- Search bar / Ask CSAIL chat entry point.
- Briefing card UI (the anchor small-story demo).

**Open questions:**

- UMAP at 200–900 nodes: does it actually separate groups, or look like a blob? Backup layouts (force-directed, group-clustered) worth prototyping early.
- What's the interaction model — click-to-zoom, hover-to-preview, drag-to-compare?
- How do we render _agent activity_ on the map? (Highlight info-nodes an active agent is reading?)
- Mobile / projector legibility for the demo.

**Dependencies:** Component 1 (data shape).

**MVP vs stretch:**

- MVP: map + profile cards + briefing card + chat entry.
- Stretch: multi-node analysis, time-machine slider, animated recursion visualization on the map.

---

## Component 3 — Agent Runtime / Ecosystem

**Goal:** The infrastructure that runs agents over the graph — state, context retrieval via edges, tool palette, orchestration patterns.

**In scope:**

- Per-agent state (Cloudflare Durable Objects as the actor model).
- Context retrieval: an agent specifies what it needs; the runtime traverses edges to fetch relevant info nodes; context is composed and passed in.
- Tool palette: which tools are system-wide (graph queries, search, embedding lookup), which are scoped per agent.
- Orchestrator + worker pattern (depth-capped, compute-budgeted).
- Heavy compute / code execution → Modal sandboxes.
- Logging / audit trail for every action.

**Open questions:**

- Context retrieval policy: how does an agent declare what it needs in a way the runtime can resolve to edges? (DSL hint here.)
- Tiered context: identity / working / retrieved / cold — what lives where, what gets summarized?
- Memory across sessions per persona — what persists, what resets?
- Failure modes: timeout, budget exhaustion, infinite loop. How does the runtime kill cleanly?
- How does an agent know what it doesn't know (so it can spawn or route)?

**Dependencies:** Component 1 (graph) and Component 4 (DNA defines what an agent is).

**MVP vs stretch:**

- MVP: orchestrator + workers, edge-based context retrieval, depth cap, audit log.
- Stretch: tiered context with summarization, persistent per-persona memory, full Modal integration.

---

## Component 4 — Agent DNA / DSL (the backbone)

**Goal:** The language and protocol that defines what an agent _is_, how it specializes, and how it spawns. Less figured-out than other components — bias toward research and prototyping early.

**In scope:**

- DNA structure: a structured, replicable system prompt that includes _spawning instructions_ + _specializing instructions_. DNA does NOT include task-specific context — context is acquired through tools.
- Spawning protocol: when an agent decides a question is out of scope, how does it produce a new agent's DNA, and how does it transfer (only) DNA + scope?
- Discovery: how do agents find each other? Router agent? Registry? Pull from graph?
- Communication: how do agents send each other questions and results? (Consider: each agent has a stable URL.)
- Specialization vs. spawning instructions — one is shared across all agents, one is unique. How do they coexist in DNA cleanly?

**Open questions:**

- What does the DNA literally look like? (YAML? JSON-LD? A constrained natural-language template?)
- How is "scope" represented so that a router agent can decide whether a given agent can answer a given question?
- Termination: how does the system prevent runaway spawning? Depth caps + budgets are necessary; are they sufficient?
- DNA versioning: when the DSL changes, do existing agents migrate, or does the new spec only apply to newly-spawned agents?
- Is the DSL a research deliverable in itself? (Possibly worth a separate write-up alongside the demo.)

**Dependencies:** Component 3 (runtime executes DNA). Components 1 and 2 use whatever Component 4 settles on.

**MVP vs stretch:**

- MVP: a DNA spec (even if rough) that the demo agents actually use. One concrete spawning event in the demo, with the DNA visible.
- Stretch: a router agent, dynamic specialization, DNA mutation/inheritance over time.

---

## Component 5 — Use Cases (Demo Features)

**Goal:** The visible agents people will see in the demo. Each one is a specific instantiation of Components 1–4.

**Small-story candidates (pick 3 for the demo):**

- Pre-meeting prep briefing (anchor — pairwise, personal, can't precompute).
- "Who should I talk to about X" (relational synthesis).
- Weekly digest / "what changed in the lab this week" (temporal).
- Reverse intro — "you should meet this person whose work overlaps with yours."
- Onboarding pack for incoming students.

**Big-story candidates (pick 1 for the demo):**

- Group-website maintainer agent: bound to a group, watches for new papers / members / projects, opens PRs against the group's site to keep it current. _Strong candidate — concrete, demonstrably useful, can't be done well by general-purpose tools because grounding in the group matters._
- Long-running autoresearch on a real group's repo, grounded in the group's prior work and conventions.
- Reviewer-suggester for a paper draft, grounded in CSAIL collaboration history.
- "Missing papers" — paper combos that don't exist yet but should, surfaced from gaps in the collaboration graph.

**Open questions:**

- Which big-story use case maximizes _grounded-in-CSAIL_ signal vs. raw model capability? (The website-maintainer is currently the front-runner because the value is obviously about knowing the group, not about model smarts.)
- For each small-story flash: what's the trigger, what's the visible artifact, what's the underlying agent + DNA + context fetch?

**Dependencies:** all of Components 1–4. This is where everything composes.

---

## Component 6 — Pitch + Demo Choreography

**Goal:** A 3-minute pitch and a demo flow that lands.

**In scope:**

- Pitch script (current draft v0.2 in conversation; needs lock).
- Demo flow: the order of small-story flashes, the big-story moment, the close.
- Recursion / agent-tree visualization for the big-story demo.
- Pre-cache strategy: what's pre-warmed, what's live.
- Backup plan if anything live fails on stage.
- Submission form (headline + pain point — see current iteration).

**Dependencies:** loosely on everything; specifically on Component 5 being demo-ready.

---

## Cross-cutting concerns

**Privacy.** Every claim sourced from public content. Test: would the person be comfortable reading the briefing about themselves? Visible "sourced from" trail on every claim. Opt-out flow. For the live demo: only profile real people the team has cleared, and prefer well-documented public figures if surprises are possible.

**Performance.** Everything in the visible UI should feel <500ms. Pre-cache aggressively. The map and the chat are the two places latency will be felt most.

**Logging / audit.** Every agent action signed and logged. Useful for the demo (you can show the trail) and necessary for trust if this ever ships.

**Demo readiness.** A feature that works in a notebook but not on the demo laptop is worth zero. End-to-end testing on the demo machine, with the projector, by Saturday afternoon at the latest.

---

## Suggested ownership (4–5 people)

| Component          | Owner(s)                        | Notes                                                                      |
| ------------------ | ------------------------------- | -------------------------------------------------------------------------- |
| 1. Knowledge Graph | 1 person                        | Scrape + storage + freshness sweepers. Heaviest day-one work.              |
| 2. Visualization   | 1 person                        | Map + cards + chat UI. Depends on (1) but can prototype against fake data. |
| 3. Agent Runtime   | 1 person                        | DOs + Modal + context retrieval. Can prototype against (1) early.          |
| 4. Agent DNA / DSL | shared (whoever's most curious) | More research than build. Outputs a spec that (3) and (5) consume.         |
| 5. Use Cases       | 1–2 people                      | Flexes across the stack. Pairs naturally with (6).                         |
| 6. Pitch + Demo    | 1 person, but everyone reviews  | Starts day one; rehearsal Saturday night.                                  |

---

## Decisions to lock by end of day one

1. KG schema (node types, edge types).
2. Storage choice confirmed (D1 + Vectorize, or alternative).
3. The three small-story flashes.
4. The one big-story use case (website-maintainer is current front-runner).
5. DNA format draft (even rough — needs to exist so 3 + 5 can build against it).
6. Demo machine + connectivity.

---

## Open questions worth resolving in conversation, not solo

- The DSL: structured format vs. constrained natural language vs. hybrid. Whoever owns Component 4 should propose options early.
- Recursion visualization design: split-screen artifact + tree, or overlaid on the map? (Component 2 + Component 6 jointly.)
- Privacy threshold for the demo subjects.
- Naming. (CSAIL Complete is the working title; collisions exist with other AI products called Parallel.)
