import { withRead } from "../client";
import type { PersonProfile } from "../types";

export async function getPersonProfile(nodeId: string): Promise<PersonProfile | null> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person {nodeId: $nodeId})
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:LOCATED_IN]->(rm:Room)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
       OPTIONAL MATCH (p)-[:MENTIONED_IN]->(n:NewsItem)
       RETURN p, collect(DISTINCT g) AS groups, collect(DISTINCT rm) AS rooms,
              collect(DISTINCT pp) AS papers, collect(DISTINCT n) AS news`,
      { nodeId }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const p = (rec.get("p") as { properties: Record<string, unknown> }).properties;
    const groups = (rec.get("groups") as { properties: Record<string, unknown> }[]).map((g) => ({ slug: g.properties.slug as string, name: g.properties.name as string }));
    const rooms = (rec.get("rooms") as { properties: Record<string, unknown> }[]).map((rm) => ({
      id: rm.properties.id as string,
      number: rm.properties.number as string,
      floor: toInt(rm.properties.floor),
    }));
    const papers = (rec.get("papers") as { properties: Record<string, unknown> }[])
      .map((pp) => ({
        title: pp.properties.title as string,
        year: toInt(pp.properties.year),
        venue: pp.properties.venue as string | undefined,
        citationCount: pp.properties.citationCount !== undefined ? toInt(pp.properties.citationCount) : undefined,
      }))
      .sort((a, b) => b.year - a.year).slice(0, 10);
    const news = (rec.get("news") as { properties: Record<string, unknown> }[])
      .map((n) => ({
        title: n.properties.title as string,
        publishedAt: (n.properties.publishedAt as string) ?? "",
        url: n.properties.url as string,
      }))
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 5);
    return {
      nodeId: p.nodeId as string,
      name: p.name as string,
      title: p.title as string,
      bio: (p.bio as string | null) ?? undefined,
      isPI: p.isPI as boolean,
      isCoreOrDual: p.isCoreOrDual as boolean,
      groups, rooms, recentPapers: papers, recentNews: news,
      stale: p.stale as boolean,
    };
  });
}

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v);
}
