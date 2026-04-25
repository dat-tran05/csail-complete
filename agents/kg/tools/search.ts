import { withRead } from "../client";

export interface PersonSearchResult {
  nodeId: string;
  name: string;
  title: string;
  isPI: boolean;
  room?: string;
  groups: string[];
}

export async function searchPeople(query: string, limit = 10): Promise<PersonSearchResult[]> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person)
       WHERE toLower(p.name) CONTAINS toLower($q)
       OPTIONAL MATCH (p)-[:LOCATED_IN]->(rm:Room)
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       WITH p, rm, collect(DISTINCT g.name) AS groups
       RETURN p.nodeId AS nodeId, p.name AS name, p.title AS title, p.isPI AS isPI,
              rm.number AS room, groups
       ORDER BY p.isPI DESC, p.name
       LIMIT toInteger($limit)`,
      { q: query, limit }
    );
    return r.records.map((rec) => ({
      nodeId: rec.get("nodeId") as string,
      name: rec.get("name") as string,
      title: rec.get("title") as string,
      isPI: rec.get("isPI") as boolean,
      room: (rec.get("room") as string | null) ?? undefined,
      groups: ((rec.get("groups") as string[]) ?? []).filter(Boolean),
    }));
  });
}
