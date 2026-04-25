import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { runAgentLoop } from "./agent";
import { makeSseWriter } from "./sse-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { messages?: MessageParam[]; message?: string };
  try { body = await req.json(); } catch { body = {}; }

  const messages: MessageParam[] = body.messages ?? (body.message
    ? [{ role: "user", content: body.message }]
    : []);

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "no messages" }), { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const writer = makeSseWriter(controller);
      try {
        await runAgentLoop({ messages, writer });
      } catch (e) {
        writer.event("error", { message: e instanceof Error ? e.message : String(e) });
      } finally {
        writer.event("done", {});
        writer.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
