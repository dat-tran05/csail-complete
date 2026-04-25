import { NextResponse } from "next/server";
import { loadRoomsForFloor, loadGroups } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const floor = parseInt(n, 10);
  if (Number.isNaN(floor)) return NextResponse.json({ error: "invalid floor" }, { status: 400 });

  const rooms = await loadRoomsForFloor(floor);
  const groups = await loadGroups();

  const groupsOnFloor = groups.filter((g) => g.roomIds.some((rid) => rooms.find((r) => r.id === rid)));

  return NextResponse.json({
    floor,
    label: `32-G${floor} · Gates Tower`,
    roomCount: rooms.length,
    groupCount: groupsOnFloor.length,
    groups: groupsOnFloor.map((g) => ({ id: g.id, name: g.name, color: g.color })),
  });
}
