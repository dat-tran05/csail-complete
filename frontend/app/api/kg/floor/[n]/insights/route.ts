import { NextResponse } from "next/server";
import { getFloorInsights } from "@/lib/kg/floor-insights";

export const revalidate = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const floor = parseInt(n, 10);
  if (Number.isNaN(floor)) {
    return NextResponse.json({ error: "invalid floor" }, { status: 400 });
  }
  try {
    const insights = await getFloorInsights(floor);
    return NextResponse.json(insights);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
