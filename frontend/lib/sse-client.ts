import type { AgentEvent } from "./agent-types";

export async function* streamSSE(url: string, init: RequestInit): AsyncGenerator<AgentEvent> {
  const resp = await fetch(url, init);
  if (!resp.ok || !resp.body) throw new Error(`SSE fetch failed: ${resp.status}`);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = parseSseChunk(chunk);
      if (event) yield event;
    }
  }
}

function parseSseChunk(chunk: string): AgentEvent | null {
  let name = "";
  let dataStr = "";
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
  }
  if (!name) return null;
  try {
    const data = dataStr ? JSON.parse(dataStr) : {};
    return { type: name, ...data } as AgentEvent;
  } catch {
    return null;
  }
}
