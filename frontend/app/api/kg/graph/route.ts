import { NextResponse } from "next/server";
import { getGraph } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const types = url.searchParams.get("types")?.split(",").filter(Boolean);
  const floor7Only = url.searchParams.get("focus") === "floor7";
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : undefined;
  try {
    const graph = await getGraph({ types, floor7Only, limit });
    return NextResponse.json(graph);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), nodes: [], edges: [] }, { status: 500 });
  }
}
