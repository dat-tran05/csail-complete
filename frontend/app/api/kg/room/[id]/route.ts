import { NextResponse } from "next/server";
import { loadRoomsForFloor, loadPeople, loadGroups } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  const groups = await loadGroups();
  const people = await loadPeople();

  let room = null;
  for (const f of [7]) {
    const rooms = await loadRoomsForFloor(f);
    const match = rooms.find((r) => r.id === decoded);
    if (match) { room = match; break; }
  }

  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  const occupyingGroups = groups.filter((g) => g.roomIds.includes(room!.id));
  const occupants = people.filter((p) =>
    p.roomIds.includes(room!.id) || occupyingGroups.some((g) => p.groupIds.includes(g.id))
  );

  return NextResponse.json({
    room,
    groups: occupyingGroups.map((g) => ({ id: g.id, name: g.name, shortName: g.shortName, color: g.color, url: g.url })),
    members: occupants.map((p) => ({ id: p.id, name: p.name, homepage: p.homepage })),
    activity: { papersThisMonth: 2, collaborations: 4 },
  });
}
