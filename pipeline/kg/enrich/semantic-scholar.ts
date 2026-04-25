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
