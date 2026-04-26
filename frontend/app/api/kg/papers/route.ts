import { NextResponse } from "next/server";
import { listPapers } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 100;
  try {
    const papers = await listPapers(limit);
    return NextResponse.json({ papers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), papers: [] }, { status: 500 });
  }
}
