import { NextResponse } from "next/server";
import { listAreas } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const areas = await listAreas();
    return NextResponse.json({ areas });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), areas: [] }, { status: 500 });
  }
}
