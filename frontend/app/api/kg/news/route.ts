import { NextResponse } from "next/server";
import { listNews } from "@/lib/kg-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 100;
  try {
    const news = await listNews(limit);
    return NextResponse.json({ news });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), news: [] }, { status: 500 });
  }
}
