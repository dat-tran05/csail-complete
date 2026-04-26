import { NextResponse } from "next/server";
import { getGroup } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  try {
    const data = await getGroup(decoded);
    if (!data) return NextResponse.json({ error: "group not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
