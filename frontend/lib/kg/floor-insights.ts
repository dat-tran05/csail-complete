import { withRead } from "../../../agents/kg/client";
import type {
  FloorInsights,
  FloorRoomInsight,
  FloorCoauthorEdge,
  FloorAreaSummary,
  FloorGroupSummary,
} from "@shared/schema/floor";

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v ?? 0);
}

function surname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 0 ? parts[parts.length - 1]! : fullName;
}

function bareRoomId(id: string): string {
  return id.replace(/^room:/, "");
}

interface OccupantRow {
  nodeId: string | null;
  name: string | null;
  isPI: boolean;
  groups: string[];
  areas: string[];
  papers: number;
}

const COAUTHOR_EDGE_LIMIT = 60;
const COAUTHOR_MIN_PAPERS = 2;

export async function getFloorInsights(floor: number): Promise<FloorInsights> {
  const yearCutoff = new Date().getFullYear() - 1;
  const newsCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  return withRead(async (s) => {
    // ─── Query 1: per-room occupants + group/area/paper aggregates ───
    const roomsResult = await s.run(
      `MATCH (r:Room {floor: $floor})
       OPTIONAL MATCH (r)<-[:LOCATED_IN]-(p:Person)
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       WITH r, p, collect(DISTINCT g.slug) AS personGroups
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
         WHERE pp.year >= $yearCutoff
       WITH r, p, personGroups, count(DISTINCT pp) AS paperCount
       OPTIONAL MATCH (p)-[:WORKS_IN_AREA|HAS_IMPACT_ON]->(a:Area)
       WITH r, p, personGroups, paperCount, collect(DISTINCT a.slug) AS personAreas
       RETURN r.id AS roomId,
              r.number AS roomNumber,
              collect(CASE WHEN p IS NULL THEN null ELSE {
                nodeId: p.nodeId,
                name: p.name,
                isPI: coalesce(p.isPI, false),
                groups: personGroups,
                areas: personAreas,
                papers: paperCount
              } END) AS occupants`,
      { floor, yearCutoff },
    );

    // ─── Query 2: news mentions per room (last 90 days) ───
    const newsResult = await s.run(
      `MATCH (r:Room {floor: $floor})<-[:LOCATED_IN]-(p:Person)-[:MENTIONED_IN]->(n:NewsItem)
       WHERE n.publishedAt >= $newsCutoff
       RETURN r.id AS roomId, count(DISTINCT n) AS newsCount`,
      { floor, newsCutoff },
    );
    const newsByRoom = new Map<string, number>();
    for (const rec of newsResult.records) {
      newsByRoom.set(bareRoomId(rec.get("roomId") as string), toInt(rec.get("newsCount")));
    }

    // ─── Query 3: coauthor pairs across rooms ───
    const coauthorResult = await s.run(
      `MATCH (a:Person)-[:LOCATED_IN]->(ra:Room {floor: $floor})
       MATCH (b:Person)-[:LOCATED_IN]->(rb:Room {floor: $floor})
       WHERE elementId(a) < elementId(b)
       MATCH (a)-[ca:COAUTHORED_WITH]-(b)
       WITH ra, rb,
            sum(coalesce(ca.paperCount, 1)) AS paperCount,
            min(coalesce(ca.firstYear, 0)) AS firstYear,
            max(coalesce(ca.lastYear, 0)) AS lastYear
       WHERE paperCount >= $minPapers AND ra.id <> rb.id
       RETURN ra.id AS fromRoomId, rb.id AS toRoomId, paperCount, firstYear, lastYear
       ORDER BY paperCount DESC
       LIMIT toInteger($limit)`,
      { floor, minPapers: COAUTHOR_MIN_PAPERS, limit: COAUTHOR_EDGE_LIMIT },
    );
    const coauthorEdges: FloorCoauthorEdge[] = coauthorResult.records.map((rec) => ({
      fromRoomId: bareRoomId(rec.get("fromRoomId") as string),
      toRoomId: bareRoomId(rec.get("toRoomId") as string),
      paperCount: toInt(rec.get("paperCount")),
      firstYear: toInt(rec.get("firstYear")),
      lastYear: toInt(rec.get("lastYear")),
    }));

    // ─── Query 4: areas on floor ───
    const areasResult = await s.run(
      `MATCH (a:Area)<-[:WORKS_IN_AREA|HAS_IMPACT_ON]-(p:Person)-[:LOCATED_IN]->(:Room {floor: $floor})
       RETURN a.slug AS slug, a.name AS name, count(DISTINCT p) AS peopleCount
       ORDER BY peopleCount DESC`,
      { floor },
    );
    const areas: FloorAreaSummary[] = areasResult.records.map((rec) => ({
      slug: rec.get("slug") as string,
      name: rec.get("name") as string,
      peopleCount: toInt(rec.get("peopleCount")),
    }));

    // ─── Query 5: groups with members on floor ───
    const groupsResult = await s.run(
      `MATCH (g:Group)<-[:MEMBER_OF]-(p:Person)-[:LOCATED_IN]->(rm:Room {floor: $floor})
       WITH g, count(DISTINCT p) AS memberCount, collect(DISTINCT rm.id) AS roomIds
       RETURN g.slug AS slug, g.name AS name, g.shortName AS shortName, g.color AS color,
              memberCount, roomIds
       ORDER BY memberCount DESC`,
      { floor },
    );
    const groups: FloorGroupSummary[] = groupsResult.records.map((rec) => ({
      slug: rec.get("slug") as string,
      name: rec.get("name") as string,
      shortName: (rec.get("shortName") as string | null) ?? null,
      color: (rec.get("color") as string | null) ?? null,
      memberCount: toInt(rec.get("memberCount")),
      roomIds: (rec.get("roomIds") as string[]).filter(Boolean).map(bareRoomId),
    }));

    const groupBySlug = new Map<string, FloorGroupSummary>();
    for (const g of groups) groupBySlug.set(g.slug, g);

    // ─── Aggregate per-room insight rows ───
    const rooms: FloorRoomInsight[] = roomsResult.records.map((rec) => {
      const roomId = bareRoomId(rec.get("roomId") as string);
      const rawNumber = (rec.get("roomNumber") as string) ?? "";
      // KG stores roomNumber as full id ("32-G780"); strip to bare ("780") for UI use.
      const number = rawNumber.replace(/^[\d]+-G/, "");
      const occupantsRaw = (rec.get("occupants") as Array<OccupantRow | null>).filter(
        (o): o is OccupantRow => o !== null && o.nodeId !== null,
      );

      const occupantCount = occupantsRaw.length;
      const recentPaperCount = occupantsRaw.reduce((sum, o) => sum + toInt(o.papers), 0);

      // PI: prefer one with most groups affiliation, else first encountered.
      const pis = occupantsRaw.filter((o) => o.isPI);
      pis.sort((a, b) => b.groups.length - a.groups.length);
      const pi = pis[0] ?? null;

      // Dominant group: weighted by occupant count, +2 if a PI is in that group.
      const groupVotes = new Map<string, number>();
      for (const o of occupantsRaw) {
        const weight = o.isPI ? 3 : 1;
        for (const slug of o.groups) {
          if (!slug) continue;
          groupVotes.set(slug, (groupVotes.get(slug) ?? 0) + weight);
        }
      }
      let dominantGroupSlug: string | null = null;
      let topVotes = 0;
      for (const [slug, votes] of groupVotes) {
        if (votes > topVotes) {
          topVotes = votes;
          dominantGroupSlug = slug;
        }
      }
      const dominantGroup = dominantGroupSlug ? groupBySlug.get(dominantGroupSlug) ?? null : null;

      const areaSet = new Set<string>();
      const groupSet = new Set<string>();
      for (const o of occupantsRaw) {
        for (const slug of o.areas) if (slug) areaSet.add(slug);
        for (const slug of o.groups) if (slug) groupSet.add(slug);
      }

      return {
        id: roomId,
        number,
        occupantCount,
        piName: pi ? surname(pi.name ?? "") : null,
        piNodeId: pi?.nodeId ?? null,
        dominantGroupSlug,
        dominantGroupColor: dominantGroup?.color ?? null,
        dominantGroupShortName: dominantGroup?.shortName ?? null,
        recentPaperCount,
        recentNewsCount: newsByRoom.get(roomId) ?? 0,
        areaSlugs: [...areaSet],
        groupSlugs: [...groupSet],
      };
    });

    return {
      floor,
      rooms,
      coauthorEdges,
      areas,
      groups,
      generatedAt: new Date().toISOString(),
    };
  });
}
