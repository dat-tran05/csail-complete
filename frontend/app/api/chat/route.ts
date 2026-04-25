import { NextResponse } from "next/server";
import { findPeopleOnFloor, getFloorSummary } from "../../../../agents/kg/tools/floor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { message: string; floor?: number };
  const msg = (body.message ?? "").toLowerCase();
  const floorMatch = msg.match(/floor\s+(\d)/);
  const floor = body.floor ?? (floorMatch ? parseInt(floorMatch[1]!, 10) : 7);

  if (/who|people|members?/.test(msg)) {
    const people = await findPeopleOnFloor(floor);
    const summary = await getFloorSummary(floor);
    const pis = people.filter((p) => p.isPI).slice(0, 5).map((p) => `${p.name} (${p.roomNumber}, ${p.groupNames[0] ?? p.title})`);
    return NextResponse.json({
      reply: `Floor ${floor} has ${summary.totalPeople} people across ${summary.groupCount} groups, with ${summary.paperCount} papers in the graph.\n\nNotable PIs: ${pis.join("; ")}`,
      people, summary,
    });
  }
  return NextResponse.json({ reply: "Try asking 'who's on floor 7?' or 'people on floor 7' to see live KG data.", people: [], summary: null });
}
