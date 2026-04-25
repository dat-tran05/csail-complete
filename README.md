# csail-complete

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
