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
