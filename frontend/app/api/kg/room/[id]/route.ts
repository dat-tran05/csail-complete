import { NextResponse } from "next/server";
import { withRead } from "../../../../../../agents/kg/client";

export const dynamic = "force-dynamic";

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v ?? 0);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const bare = decoded.replace(/^room:/, "");
  const yearCutoff = new Date().getFullYear() - 1;

  try {
    const data = await withRead(async (s) => {
      const r = await s.run(
        `MATCH (rm:Room)
         WHERE rm.id = $id OR rm.id = $bare OR rm.id = ('room:' + $bare)
         OPTIONAL MATCH (rm)-[:BELONGS_TO]->(g:Group)
         OPTIONAL MATCH (p:Person)-[:LOCATED_IN]->(rm)
         OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
            WHERE pp.year >= $yearCutoff
         OPTIONAL MATCH (p)-[:MENTIONED_IN]->(news:NewsItem)
         OPTIONAL MATCH (p)-[:WORKS_ON]->(proj:Project)
         RETURN rm,
                collect(DISTINCT g) AS groups,
                collect(DISTINCT p) AS members,
                collect(DISTINCT pp) AS papers,
                collect(DISTINCT news) AS news,
                collect(DISTINCT proj) AS projects`,
        { id: decoded, bare, yearCutoff }
      );
      if (r.records.length === 0) return null;
      const rec = r.records[0]!;
      const rmProps = (rec.get("rm") as { properties: Record<string, unknown> }).properties;
      const room = {
        id: rmProps.id as string,
        number: rmProps.number as string,
        floor: toInt(rmProps.floor),
        type: (rmProps.type as string) ?? "office",
        label: rmProps.label as string | undefined,
      };
      const groups = (rec.get("groups") as { properties: Record<string, unknown> }[])
        .filter((g) => g && g.properties)
        .map((g) => ({
          id: g.properties.id as string,
          name: g.properties.name as string,
          shortName: g.properties.shortName as string | undefined,
          color: g.properties.color as string | undefined,
          url: g.properties.url as string | undefined,
        }));
      const members = (rec.get("members") as { properties: Record<string, unknown> }[])
        .filter((p) => p && p.properties)
        .map((p) => ({
          id: p.properties.nodeId as string,
          name: p.properties.name as string,
          title: p.properties.title as string | undefined,
          homepage: p.properties.homepage as string | undefined,
          photoUrl: p.properties.photoUrl as string | undefined,
        }));

      type Node = { properties: Record<string, unknown> };
      const recentPapers = (rec.get("papers") as Node[])
        .filter((n) => n && n.properties)
        .map((n) => ({
          id: n.properties.id as string,
          title: n.properties.title as string,
          year: toInt(n.properties.year),
          venue: n.properties.venue as string | undefined,
        }))
        .sort((a, b) => b.year - a.year)
        .slice(0, 5);

      const recentNews = (rec.get("news") as Node[])
        .filter((n) => n && n.properties)
        .map((n) => ({
          id: (n.properties.id as string) ?? (n.properties.slug as string),
          slug: n.properties.slug as string | undefined,
          title: n.properties.title as string,
          publishedAt: (n.properties.publishedAt as string) ?? "",
          source: n.properties.source as string | undefined,
        }))
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
        .slice(0, 3);

      const projects = (rec.get("projects") as Node[])
        .filter((n) => n && n.properties)
        .map((n) => ({
          id: n.properties.id as string,
          slug: n.properties.slug as string | undefined,
          title: (n.properties.title as string) ?? (n.properties.name as string),
          teaser: n.properties.teaser as string | undefined,
        }))
        .slice(0, 5);

      return {
        room,
        groups,
        members,
        activity: { papersThisMonth: recentPapers.length, collaborations: members.length },
        recentPapers,
        recentNews,
        projects,
      };
    });

    if (!data) {
      return NextResponse.json({ error: "room not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
