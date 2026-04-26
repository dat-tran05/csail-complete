import { NextResponse } from "next/server";
import { listPeople } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    const people = await listPeople({
      limit:  url.searchParams.get("limit")  ? parseInt(url.searchParams.get("limit")!, 10)  : undefined,
      cursor: url.searchParams.get("cursor") ? parseInt(url.searchParams.get("cursor")!, 10) : undefined,
      group:  url.searchParams.get("group")  ?? undefined,
      role:   url.searchParams.get("role")   ?? undefined,
      floor:  url.searchParams.get("floor")  ? parseInt(url.searchParams.get("floor")!, 10)  : undefined,
      q:      url.searchParams.get("q")      ?? undefined,
    });
    return NextResponse.json({ people });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), people: [] }, { status: 500 });
  }
}
