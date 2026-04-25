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
      homepage: p.homepage ?? null,
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
