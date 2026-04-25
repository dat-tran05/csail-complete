import { withRead } from "../client";
import type { FloorPerson } from "../types";

export async function findPeopleOnFloor(floor: number): Promise<FloorPerson[]> {
  return withRead(async (s) => {
    const cutoff = new Date().getFullYear() - 2;
    const r = await s.run(
      `MATCH (p:Person)-[:LOCATED_IN]->(r:Room)
       WHERE r.floor = $floor
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper) WHERE pp.year >= $cutoff
       RETURN p.nodeId AS nodeId, p.name AS name, p.title AS title, p.isPI AS isPI,
              r.number AS roomNumber, collect(DISTINCT g.name) AS groupNames,
              count(DISTINCT pp) AS paperCount
       ORDER BY p.isPI DESC, p.name`,
      { floor, cutoff }
    );
    return r.records.map((rec) => ({
      nodeId: rec.get("nodeId") as string,
      name: rec.get("name") as string,
      title: rec.get("title") as string,
      isPI: rec.get("isPI") as boolean,
      roomNumber: rec.get("roomNumber") as string,
      groupNames: (rec.get("groupNames") as string[]).filter(Boolean),
      recentPaperCount: toInt(rec.get("paperCount")),
    }));
  });
}

export async function getFloorSummary(floor: number): Promise<{ floor: number; totalPeople: number; piCount: number; groupCount: number; paperCount: number }> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person)-[:LOCATED_IN]->(rm:Room) WHERE rm.floor = $floor
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
       RETURN count(DISTINCT p) AS people, count(DISTINCT CASE WHEN p.isPI THEN p END) AS pis,
              count(DISTINCT g) AS groups, count(DISTINCT pp) AS papers`,
      { floor }
    );
    const rec = r.records[0]!;
    return {
      floor,
      totalPeople: toInt(rec.get("people")),
      piCount: toInt(rec.get("pis")),
      groupCount: toInt(rec.get("groups")),
      paperCount: toInt(rec.get("papers")),
    };
  });
}

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v);
}
