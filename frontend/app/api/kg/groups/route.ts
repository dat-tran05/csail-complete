import { NextResponse } from "next/server";
import { listGroups } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await listGroups();
    return NextResponse.json({ groups });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), groups: [] }, { status: 500 });
  }
}
