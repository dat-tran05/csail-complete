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

  try {
    const data = await withRead(async (s) => {
      const r = await s.run(
        `MATCH (rm:Room)
         WHERE rm.id = $id OR rm.id = $bare OR rm.id = ('room:' + $bare)
         OPTIONAL MATCH (rm)-[:BELONGS_TO]->(g:Group)
         OPTIONAL MATCH (p:Person)-[:LOCATED_IN]->(rm)
         OPTIONAL MATCH (rm)<-[:BELONGS_TO]-(rm2:Room)
         OPTIONAL MATCH (rm)-[:AUTHORED|BELONGS_TO]-(pp:Paper)
            WHERE pp.year >= toInteger(date().year - 1)
         RETURN rm,
                collect(DISTINCT g) AS groups,
                collect(DISTINCT p) AS members,
                count(DISTINCT pp) AS papersThisMonth`,
        { id: decoded, bare }
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

      return {
        room,
        groups,
        members,
        activity: { papersThisMonth: toInt(rec.get("papersThisMonth")), collaborations: members.length },
      };
    });

    if (!data) {
      // Fall back to the local sample/json file for floors that aren't in Neo4j
      return NextResponse.json({ error: "room not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
