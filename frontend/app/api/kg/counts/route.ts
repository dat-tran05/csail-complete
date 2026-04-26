import { NextResponse } from "next/server";
import { withRead } from "../../../../../agents/kg/client";

export const dynamic = "force-dynamic";

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v ?? 0);
}

export async function GET() {
  try {
    const counts = await withRead(async (s) => {
      const r = await s.run(
        `RETURN
            count { (n:Person) }   AS people,
            count { (n:Group) }    AS groups,
            count { (n:Project) }  AS projects,
            count { (n:Paper) }    AS papers,
            count { (n:NewsItem) } AS news,
            count { (n:Area) }     AS areas,
            count { (n:Room) }     AS rooms`
      );
      const rec = r.records[0];
      if (!rec) return { people: 0, groups: 0, projects: 0, papers: 0, news: 0, areas: 0, rooms: 0 };
      return {
        people:   toInt(rec.get("people")),
        groups:   toInt(rec.get("groups")),
        projects: toInt(rec.get("projects")),
        papers:   toInt(rec.get("papers")),
        news:     toInt(rec.get("news")),
        areas:    toInt(rec.get("areas")),
        rooms:    toInt(rec.get("rooms")),
      };
    });
    return NextResponse.json(counts);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
