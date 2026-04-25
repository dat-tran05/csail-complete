import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { message } = await req.json().catch(() => ({ message: "" }));
  return NextResponse.json({
    echo: message,
    reply: "Chat agent coming next round — for now, click rooms directly to explore.",
  });
}
