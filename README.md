# csail-complete

A Next.js + R3F frontend over a Neo4j knowledge graph of CSAIL (1,493 people, ~1,900 papers, 400+ news articles), with a Bedrock-backed chat agent that queries the graph via tools. Demo focuses on Floor 7 of the Stata Center.

## Handoff / first-run setup

Everything needed to run the demo is in this repo. The two external dependencies are **Docker** (for Neo4j) and **AWS Bedrock access** (for the chat agent).

### 1. Prereqs

- Docker Desktop running
- [Bun](https://bun.sh) installed
- AWS account with Bedrock model access enabled for `claude-sonnet-4-6` in `us-east-1` ([request access here](https://console.aws.amazon.com/bedrock/home#/modelaccess))

### 2. Environment

```bash
cp .env.example .env
# Fill in AWS credentials (see .env.example for the full list)
```

The chat agent (`frontend/app/api/chat/agent.ts`) uses `@anthropic-ai/bedrock-sdk`, which reads AWS credentials from the standard chain — env vars in `.env`, `~/.aws/credentials`, or an IAM role. Any of these works.

### 3. Bring up Neo4j with the prebuilt KG snapshot

```bash
docker compose up -d                 # Neo4j on :7687 (bolt) and :7474 (browser)
bun install                          # root deps for the pipeline
bun pipeline:kg:restore              # restore snapshots/csail-kg-2026-04-25.dump (~5MB)
```

Verify at http://localhost:7474 (login `neo4j` / `csail-dev-password`):

```cypher
MATCH (p:Person) RETURN count(p)     // expect 1493
```

### 4. Run the frontend

```bash
cd frontend && bun install && bun dev
# open http://localhost:3000
```

## What's in the repo (committed assets)

| Asset | Path | Notes |
|---|---|---|
| Neo4j KG snapshot | `snapshots/csail-kg-2026-04-25.dump` | 5.3MB — restore via `bun pipeline:kg:restore` |
| Stata 3D model | `frontend/public/models/stata.glb` | 7.8MB — derived from the 3DWarehouse source |
| CSAIL directory scrape | `data/people.jsonl` | 1.2MB — input for the ingest pipeline |
| Curated seeds | `data/groups.json`, `data/people-fallback.json`, `data/rooms-floor-7-sample.json` | hand-curated overrides |
| Stata floor plans | `data/map/stata-floorplans.pdf` | reference |
| Neo4j stack | `docker-compose.yml` | Neo4j 5.20 + APOC |

## What's NOT in the repo (and why it's fine)

- **AWS credentials** — provide your own in `.env` (Bedrock).
- **Raw 3D source assets** (`data/source/3dwarehouse/`, `data/source/rvsn/`) — 45MB of DWG/PLY/raw GLB. Gitignored; the cleaned `stata.glb` is committed and is all the app loads at runtime. You only need the source if you want to re-derive the model.
- **Regenerable pipeline outputs** — author-candidate JSONL, S2 progress files, etc. Recreated by the enrichment pipeline.

## Rebuilding the KG from scratch (skip if using the snapshot)

```bash
docker compose up -d
bun pipeline:kg:schema               # apply constraints + indexes
bun pipeline:kg:ingest               # ingest 1,493 people from data/people.jsonl
bun pipeline:kg:enrich:floor7        # deep S2 enrichment for Floor 7 cohort (~10 min)
bun pipeline:kg:news                 # scrape last 3 years of CSAIL news (~5 min)
bun pipeline:kg:snapshot             # save a new dump to snapshots/
```

Optional but recommended: set `SEMANTIC_SCHOLAR_API_KEY` in `.env` to raise S2 rate limits.

## Browse the graph

```cypher
MATCH (p:Person)-[:LOCATED_IN]->(r:Room {floor: 7}) RETURN p, r
MATCH (p:Person)-[:AUTHORED]->(pp:Paper) WHERE p.name = "Armando Solar-Lezama" RETURN pp.title, pp.year ORDER BY pp.year DESC LIMIT 10
MATCH (a:Person)-[r:COAUTHORED_WITH]-(b:Person) RETURN a.name, b.name, r.paperCount ORDER BY r.paperCount DESC LIMIT 20
```

## Architecture

- KG design: `docs/superpowers/specs/2026-04-25-knowledge-graph-neo4j-design.md`
- Project overview: `docs/OVERVIEW.md`
- Chat agent harness: `frontend/app/api/chat/` (Bedrock streaming, extended thinking, tool use → Neo4j tools in `agents/kg/tools/`)
