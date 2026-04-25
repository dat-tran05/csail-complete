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

  for (const rid of hci!.roomIds) {
    const floorMatch = rid.match(/^32-[A-Z]?(\d)/);
    const wingMatch = rid.match(/^32-([A-Z])/);
    await session.run(
      `MERGE (r:Room {id: $rid}) ON CREATE SET r.number = $number, r.floor = $floor, r.wing = $wing
       WITH r MATCH (g:Group {slug: "hci-lab"}) MERGE (g)-[rel:LOCATED_IN]->(r)
       SET rel.source = "hci-lab-scrape", rel.fetchedAt = $now`,
      {
        rid: `room:${rid}`,
        number: rid,
        floor: parseInt(floorMatch?.[1] ?? "7", 10),
        wing: wingMatch?.[1] ?? null,
        now: provenance.fetchedAt,
      }
    );
  }

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
