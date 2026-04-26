import { NextResponse } from "next/server";
import { listProjects } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), projects: [] }, { status: 500 });
  }
}
