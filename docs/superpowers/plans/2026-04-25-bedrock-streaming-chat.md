# Bedrock Streaming Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace `ChatBar` stub with a streaming CoT chat. Backend uses `@anthropic-ai/bedrock-sdk` to call `us.anthropic.claude-sonnet-4-6` with extended thinking + tool use loop. Frontend renders thinking accordion + tool steps + answer markdown live in CSAIL HUD style.

**Spec:** `docs/superpowers/specs/2026-04-25-bedrock-streaming-chat-design.md`

**Reference (logic only, not visuals):** `/Users/datct/CSProjects/PersonalProjects/trip-doc-agent/`

---

## Task 1: Dependencies + new KG tools

**Files:**
- Modify: `package.json` (add `@anthropic-ai/bedrock-sdk`)
- Modify: `frontend/package.json` (add `react-markdown`, `remark-gfm`)
- Create: `agents/kg/tools/search.ts`
- Modify: `agents/kg/tools/person.ts` (add `findCoauthors`, `recentNewsForPerson`)

- [ ] **Step 1: Install backend SDK**

```bash
bun add @anthropic-ai/bedrock-sdk
```

- [ ] **Step 2: Install frontend markdown deps**

```bash
cd frontend && bun add react-markdown remark-gfm && cd ..
```

- [ ] **Step 3: Create `agents/kg/tools/search.ts`**

```ts
import { withRead } from "../client";

export interface PersonSearchResult {
  nodeId: string;
  name: string;
  title: string;
  isPI: boolean;
  room?: string;
  groups: string[];
}

export async function searchPeople(query: string, limit = 10): Promise<PersonSearchResult[]> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person)
       WHERE toLower(p.name) CONTAINS toLower($q)
       OPTIONAL MATCH (p)-[:LOCATED_IN]->(rm:Room)
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       WITH p, rm, collect(DISTINCT g.name) AS groups
       RETURN p.nodeId AS nodeId, p.name AS name, p.title AS title, p.isPI AS isPI,
              rm.number AS room, groups
       ORDER BY p.isPI DESC, p.name
       LIMIT toInteger($limit)`,
      { q: query, limit }
    );
    return r.records.map((rec) => ({
      nodeId: rec.get("nodeId") as string,
      name: rec.get("name") as string,
      title: rec.get("title") as string,
      isPI: rec.get("isPI") as boolean,
      room: (rec.get("room") as string | null) ?? undefined,
      groups: ((rec.get("groups") as string[]) ?? []).filter(Boolean),
    }));
  });
}
```

- [ ] **Step 4: Append to `agents/kg/tools/person.ts`**

After the existing `getPersonProfile` function, append:

```ts
export interface CoauthorEdge {
  nodeId: string;
  name: string;
  paperCount: number;
  firstYear?: number;
  lastYear?: number;
}

export async function findCoauthors(nodeId: string, limit = 10): Promise<CoauthorEdge[]> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person {nodeId: $nodeId})-[r:COAUTHORED_WITH]-(c:Person)
       RETURN c.nodeId AS nodeId, c.name AS name, r.paperCount AS paperCount,
              r.firstYear AS firstYear, r.lastYear AS lastYear
       ORDER BY r.paperCount DESC
       LIMIT toInteger($limit)`,
      { nodeId, limit }
    );
    return r.records.map((rec) => ({
      nodeId: rec.get("nodeId") as string,
      name: rec.get("name") as string,
      paperCount: toInt(rec.get("paperCount")),
      firstYear: rec.get("firstYear") ? toInt(rec.get("firstYear")) : undefined,
      lastYear: rec.get("lastYear") ? toInt(rec.get("lastYear")) : undefined,
    }));
  });
}

export interface NewsForPerson {
  title: string;
  publishedAt: string;
  url: string;
  excerpt?: string;
}

export async function recentNewsForPerson(nodeId: string, limit = 5): Promise<NewsForPerson[]> {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person {nodeId: $nodeId})-[:MENTIONED_IN]->(n:NewsItem)
       RETURN n.title AS title, n.publishedAt AS publishedAt, n.url AS url, n.excerpt AS excerpt
       ORDER BY n.publishedAt DESC
       LIMIT toInteger($limit)`,
      { nodeId, limit }
    );
    return r.records.map((rec) => ({
      title: rec.get("title") as string,
      publishedAt: (rec.get("publishedAt") as string) ?? "",
      url: rec.get("url") as string,
      excerpt: (rec.get("excerpt") as string | null) ?? undefined,
    }));
  });
}
```

- [ ] **Step 5: Smoke-test new tools**

Create `/tmp/new-tools-smoke.ts`:
```ts
import { searchPeople } from "/Users/datct/CSProjects/Hackathons/csail-complete/agents/kg/tools/search";
import { findCoauthors, recentNewsForPerson } from "/Users/datct/CSProjects/Hackathons/csail-complete/agents/kg/tools/person";
import { closeDriver } from "/Users/datct/CSProjects/Hackathons/csail-complete/agents/kg/client";

console.log("search 'Solar':", await searchPeople("Solar", 3));
const coauth = await findCoauthors("3831", 5);  // Armando
console.log("Armando coauthors:", coauth);
const news = await recentNewsForPerson("3831", 3);
console.log("Armando news:", news);
await closeDriver();
```

```bash
bun /tmp/new-tools-smoke.ts && rm /tmp/new-tools-smoke.ts
```

Expected: search returns ≥1 result; coauthors may be 0-5 (limited cohort); news may be 0-3.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock frontend/package.json frontend/bun.lock agents/kg/tools/search.ts agents/kg/tools/person.ts
git commit -m "kg: new agent tools — search_people, find_coauthors, recent_news_for_person + bedrock-sdk dep"
```

---

## Task 2: Backend SSE infrastructure

**Files:**
- Create: `frontend/app/api/chat/sse-server.ts`
- Create: `frontend/app/api/chat/system-prompt.ts`
- Create: `frontend/app/api/chat/tools.ts`

- [ ] **Step 1: `sse-server.ts`** — wraps a `ReadableStreamDefaultController` with typed event writes

```ts
const encoder = new TextEncoder();

export interface SseWriter {
  event(name: string, data: unknown): void;
  close(): void;
}

export function makeSseWriter(controller: ReadableStreamDefaultController<Uint8Array>): SseWriter {
  let closed = false;
  return {
    event(name, data) {
      if (closed) return;
      const payload = `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(payload));
    },
    close() {
      if (closed) return;
      closed = true;
      try { controller.close(); } catch {}
    },
  };
}
```

- [ ] **Step 2: `system-prompt.ts`**

```ts
export const SYSTEM_PROMPT = `You are a knowledgeable guide to the MIT CSAIL knowledge graph, focused on the Stata Center building. The current demo surfaces Floor 7 (the G-wing of floor 7), which houses research groups including the HCI Lab, Visualization Group, Computer-Aided Programming, Computation Structures, Theory of Computation, and more.

You have tools to query a Neo4j graph populated from the CSAIL directory (1,493 people), Semantic Scholar (1,877+ papers, with deep coverage for the Floor 7 cohort), and CSAIL news (407 articles). When a user asks about people, groups, projects, papers, or rooms, prefer calling tools over guessing.

Decompose broad questions into specific lookups. When citing people or groups, use their canonical names from the graph. Keep answers concise and grounded — never fabricate identifiers, room numbers, paper titles, or news headlines.

If a person's CSAIL profile hasn't been updated in years (the graph marks them stale: true), mention that briefly when surfacing them.`;
```

- [ ] **Step 3: `tools.ts`** — Bedrock tool specs + dispatch

```ts
import { findPeopleOnFloor, getFloorSummary } from "../../../../agents/kg/tools/floor";
import { getPersonProfile, findCoauthors, recentNewsForPerson } from "../../../../agents/kg/tools/person";
import { searchPeople } from "../../../../agents/kg/tools/search";

export const TOOL_SPECS = [
  {
    name: "find_people_on_floor",
    description: "List all CSAIL people whose office is on a given floor of the Stata Center. Returns name, title, room, group affiliations, and recent paper count.",
    input_schema: { type: "object", properties: { floor: { type: "integer", description: "Floor number (1-9)" } }, required: ["floor"] },
  },
  {
    name: "get_floor_summary",
    description: "Aggregate stats for a floor: total people, PI count, group count, paper count.",
    input_schema: { type: "object", properties: { floor: { type: "integer" } }, required: ["floor"] },
  },
  {
    name: "get_person_profile",
    description: "Full profile for one CSAIL person by their CSAIL nodeId. Returns bio, groups, rooms, recent papers, recent news mentions.",
    input_schema: { type: "object", properties: { nodeId: { type: "string", description: "CSAIL CMS node id (digits, e.g. 3831)" } }, required: ["nodeId"] },
  },
  {
    name: "search_people",
    description: "Fuzzy search for CSAIL people by name substring. Returns up to N matches with basic info.",
    input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", default: 10 } }, required: ["query"] },
  },
  {
    name: "find_coauthors",
    description: "Find people in the Floor 7 cohort who have coauthored papers with this person. Sorted by paper count.",
    input_schema: { type: "object", properties: { nodeId: { type: "string" }, limit: { type: "integer", default: 10 } }, required: ["nodeId"] },
  },
  {
    name: "recent_news_for_person",
    description: "Recent CSAIL news articles mentioning this person, newest first.",
    input_schema: { type: "object", properties: { nodeId: { type: "string" }, limit: { type: "integer", default: 5 } }, required: ["nodeId"] },
  },
] as const;

export type ToolName = typeof TOOL_SPECS[number]["name"];

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "find_people_on_floor": return findPeopleOnFloor(input.floor as number);
    case "get_floor_summary": return getFloorSummary(input.floor as number);
    case "get_person_profile": return getPersonProfile(input.nodeId as string);
    case "search_people": return searchPeople(input.query as string, (input.limit as number) ?? 10);
    case "find_coauthors": return findCoauthors(input.nodeId as string, (input.limit as number) ?? 10);
    case "recent_news_for_person": return recentNewsForPerson(input.nodeId as string, (input.limit as number) ?? 5);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/chat/sse-server.ts frontend/app/api/chat/system-prompt.ts frontend/app/api/chat/tools.ts
git commit -m "chat: SSE writer + system prompt + tool registry for Bedrock agent"
```

---

## Task 3: Bedrock agent loop + chat route

**Files:**
- Create: `frontend/app/api/chat/agent.ts`
- Modify: `frontend/app/api/chat/route.ts`

- [ ] **Step 1: `agent.ts`** — extracted agent loop using `@anthropic-ai/bedrock-sdk`

```ts
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import type { MessageParam, ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import { SYSTEM_PROMPT } from "./system-prompt";
import { TOOL_SPECS, executeTool } from "./tools";
import type { SseWriter } from "./sse-server";

const MODEL = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-4-6";
const MAX_ITERATIONS = 5;
const THINKING_BUDGET = 4000;
const MAX_TOKENS = 8000;

const client = new AnthropicBedrock({
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
});

export async function runAgentLoop(opts: { messages: MessageParam[]; writer: SseWriter }): Promise<void> {
  const { messages, writer } = opts;
  const turnId = crypto.randomUUID();
  writer.event("turn_start", { turnId });

  const conversation: MessageParam[] = [...messages];

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      thinking: { type: "enabled", budget_tokens: THINKING_BUDGET },
      tools: TOOL_SPECS as never,
      messages: conversation,
    });

    const assistantContent: ContentBlock[] = [];
    const pendingToolUses: Array<{ id: string; name: string; inputJsonParts: string[] }> = [];
    let stopReason: string | null = null;

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "tool_use") {
          pendingToolUses.push({ id: block.id, name: block.name, inputJsonParts: [] });
          writer.event("tool_use_start", { toolUseId: block.id, name: block.name });
        }
      } else if (event.type === "content_block_delta") {
        const delta = event.delta;
        if (delta.type === "thinking_delta") {
          writer.event("thinking_delta", { delta: delta.thinking });
        } else if (delta.type === "text_delta") {
          writer.event("text_delta", { delta: delta.text });
        } else if (delta.type === "input_json_delta") {
          const tu = pendingToolUses[pendingToolUses.length - 1];
          if (tu) {
            tu.inputJsonParts.push(delta.partial_json);
            writer.event("input_json_delta", { toolUseId: tu.id, partialJson: delta.partial_json });
          }
        }
      } else if (event.type === "message_stop") {
        // capture stop reason from final message
      }
    }

    const finalMessage = await stream.finalMessage();
    stopReason = finalMessage.stop_reason;
    assistantContent.push(...finalMessage.content);
    conversation.push({ role: "assistant", content: assistantContent });

    const toolUses = assistantContent.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");
    if (toolUses.length === 0) break;

    const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }> = [];
    for (const tu of toolUses) {
      const startedAt = Date.now();
      try {
        const result = await executeTool(tu.name, tu.input as Record<string, unknown>);
        const resultStr = JSON.stringify(result);
        const truncated = resultStr.length > 8000 ? resultStr.slice(0, 8000) + "...[truncated]" : resultStr;
        writer.event("tool_result", { toolUseId: tu.id, status: "ok", result, durationMs: Date.now() - startedAt });
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: truncated });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        writer.event("tool_result", { toolUseId: tu.id, status: "error", result: { error: msg }, durationMs: Date.now() - startedAt });
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: msg, is_error: true });
      }
    }
    conversation.push({ role: "user", content: toolResults });

    if (stopReason !== "tool_use") break;
  }

  writer.event("turn_end", { turnId });
}
```

- [ ] **Step 2: Replace `route.ts`**

```ts
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
```

- [ ] **Step 3: Live-test the streaming endpoint**

Make sure `AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION`, `BEDROCK_MODEL_ID` are set. Then:

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"who is on floor 7?"}]}' 2>&1 | head -100
```

Expected: stream of `event: ...` lines including `thinking_delta`, possibly `tool_use_start` (`name: find_people_on_floor`), `tool_result`, `text_delta`, ending with `done`.

If you see an HTTP 5xx or auth error, check that the env vars are exported in the dev server's environment. Restart `bun dev` if needed.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/chat/agent.ts frontend/app/api/chat/route.ts
git commit -m "chat: Bedrock streaming agent loop with extended thinking + tool use"
```

---

## Task 4: Frontend SSE client + types + hook

**Files:**
- Create: `frontend/lib/agent-types.ts`
- Create: `frontend/lib/sse-client.ts`
- Create: `frontend/hooks/useAgentStream.ts`

- [ ] **Step 1: `agent-types.ts`**

```ts
export type AgentEvent =
  | { type: "turn_start"; turnId: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "text_delta"; delta: string }
  | { type: "tool_use_start"; toolUseId: string; name: string }
  | { type: "input_json_delta"; toolUseId: string; partialJson: string }
  | { type: "tool_result"; toolUseId: string; status: "ok" | "error"; result: unknown; durationMs: number }
  | { type: "turn_end"; turnId: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ToolStepState {
  toolUseId: string;
  name: string;
  input: string;        // accumulated partial JSON
  status: "running" | "ok" | "error";
  result?: unknown;
  durationMs?: number;
}

export interface Turn {
  id: string;
  user: string;
  thinking: string;
  thinkingStartedAt: number;
  thinkingMs?: number;
  toolSteps: ToolStepState[];
  answer: string;
  status: "running" | "done" | "error";
  errorMessage?: string;
}
```

- [ ] **Step 2: `sse-client.ts`**

```ts
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
```

- [ ] **Step 3: `useAgentStream.ts`**

```ts
"use client";
import { useCallback, useState } from "react";
import type { AgentEvent, Turn, ToolStepState } from "../lib/agent-types";
import { streamSSE } from "../lib/sse-client";

export function useAgentStream() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  const send = useCallback(async (userMessage: string) => {
    if (busy || !userMessage.trim()) return;
    setBusy(true);

    const turnId = crypto.randomUUID();
    const newTurn: Turn = {
      id: turnId,
      user: userMessage,
      thinking: "",
      thinkingStartedAt: Date.now(),
      toolSteps: [],
      answer: "",
      status: "running",
    };

    setTurns((prev) => [...prev, newTurn]);

    const history = turns.flatMap((t) => [
      { role: "user" as const, content: t.user },
      ...(t.answer ? [{ role: "assistant" as const, content: t.answer }] : []),
    ]);

    const messages = [...history, { role: "user" as const, content: userMessage }];

    try {
      for await (const ev of streamSSE("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      })) {
        applyEvent(turnId, ev);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTurns((prev) => prev.map((t) => t.id === turnId ? { ...t, status: "error", errorMessage: msg } : t));
    } finally {
      setBusy(false);
    }
  }, [busy, turns]);

  function applyEvent(turnId: string, ev: AgentEvent) {
    setTurns((prev) => prev.map((t) => {
      if (t.id !== turnId) return t;
      switch (ev.type) {
        case "thinking_delta":
          return { ...t, thinking: t.thinking + ev.delta };
        case "text_delta":
          return { ...t, answer: t.answer + ev.delta };
        case "tool_use_start":
          return { ...t, toolSteps: [...t.toolSteps, { toolUseId: ev.toolUseId, name: ev.name, input: "", status: "running" } as ToolStepState] };
        case "input_json_delta":
          return { ...t, toolSteps: t.toolSteps.map((s) => s.toolUseId === ev.toolUseId ? { ...s, input: s.input + ev.partialJson } : s) };
        case "tool_result":
          return { ...t, toolSteps: t.toolSteps.map((s) => s.toolUseId === ev.toolUseId ? { ...s, status: ev.status, result: ev.result, durationMs: ev.durationMs } : s) };
        case "turn_end":
          return { ...t, status: "done", thinkingMs: Date.now() - t.thinkingStartedAt };
        case "error":
          return { ...t, status: "error", errorMessage: ev.message };
        default:
          return t;
      }
    }));
  }

  return { turns, busy, send };
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/agent-types.ts frontend/lib/sse-client.ts frontend/hooks/useAgentStream.ts
git commit -m "chat: frontend SSE client + agent stream hook + event types"
```

---

## Task 5: UI components (CSAIL HUD style)

**Files:**
- Create: `frontend/components/chat/ThinkingBlock.tsx`
- Create: `frontend/components/chat/ToolStep.tsx`
- Create: `frontend/components/chat/AnswerMarkdown.tsx`
- Create: `frontend/components/chat/Turn.tsx`
- Create: `frontend/components/chat/Conversation.tsx`
- Create: `frontend/components/chat/ChatInput.tsx`
- Create: `frontend/components/chat/ChatPanel.tsx`

- [ ] **Step 1: `ThinkingBlock.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";

interface Props {
  thinking: string;
  status: "running" | "done" | "error";
  toolCount: number;
  durationMs?: number;
}

export function ThinkingBlock({ thinking, status, toolCount, durationMs }: Props) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (status !== "running") setOpen(false);
  }, [status]);

  if (!thinking && status === "running") {
    return <div className="text-[10px] text-[#7a8aa0] italic px-2 py-1 font-mono">thinking…</div>;
  }
  if (!thinking) return null;

  const seconds = durationMs ? (durationMs / 1000).toFixed(1) : null;
  const label = status === "running"
    ? `thinking…`
    : `Thought${seconds ? ` for ${seconds}s` : ""}${toolCount ? ` · ${toolCount} tool call${toolCount === 1 ? "" : "s"}` : ""}`;

  return (
    <div className="border-l border-[rgba(140,160,200,0.18)] pl-2 my-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-[#7a8aa0] font-mono hover:text-[#a8b8d0] transition-colors"
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <div className="mt-1 text-[10px] text-[#7a8aa0] font-mono italic whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
          {thinking}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `ToolStep.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { ToolStepState } from "../../lib/agent-types";

const TOOL_LABELS: Record<string, string> = {
  find_people_on_floor: "people on floor",
  get_floor_summary: "floor summary",
  get_person_profile: "person profile",
  search_people: "search people",
  find_coauthors: "coauthors",
  recent_news_for_person: "recent news",
};

export function ToolStep({ step }: { step: ToolStepState }) {
  const [open, setOpen] = useState(false);
  const dot = step.status === "running" ? "◯" : step.status === "ok" ? "●" : "✕";
  const dotColor = step.status === "running" ? "text-[#7a8aa0]" : step.status === "ok" ? "text-[#6abf6e]" : "text-[#e26b4a]";
  const inputPreview = step.input.length > 80 ? step.input.slice(0, 80) + "…" : step.input;
  const label = TOOL_LABELS[step.name] ?? step.name;
  const ms = step.durationMs ? `${step.durationMs}ms` : null;

  return (
    <div className="border-l border-[rgba(140,160,200,0.18)] pl-2 my-1">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-[10px] font-mono hover:text-[#d0d8e4] transition-colors w-full text-left">
        <span className={dotColor}>{dot}</span>
        <span className="text-[#a8b8d0]">{label}</span>
        <span className="text-[#5a78a0] truncate">{inputPreview}</span>
        {ms && <span className="text-[#5a78a0] ml-auto">{ms}</span>}
      </button>
      {open && step.result !== undefined && (
        <pre className="mt-1 text-[9px] text-[#7a8aa0] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-[rgba(0,0,0,0.3)] p-2 rounded">
          {JSON.stringify(step.result, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `AnswerMarkdown.tsx`**

```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AnswerMarkdown({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="text-[11px] text-[#d0d8e4] font-mono leading-relaxed prose prose-invert prose-sm max-w-none
                    [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0
                    [&_a]:text-[#a8b8d0] [&_a]:underline
                    [&_code]:bg-[rgba(0,0,0,0.3)] [&_code]:px-1 [&_code]:rounded">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 4: `Turn.tsx`**

```tsx
"use client";
import type { Turn as TurnT } from "../../lib/agent-types";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolStep } from "./ToolStep";
import { AnswerMarkdown } from "./AnswerMarkdown";

export function Turn({ turn }: { turn: TurnT }) {
  return (
    <div className="my-3">
      <div className="text-[11px] text-[#a8b8d0] font-mono mb-2">
        <span className="text-[#5a78a0]">›</span> {turn.user}
      </div>
      <div className="ml-3">
        <ThinkingBlock thinking={turn.thinking} status={turn.status} toolCount={turn.toolSteps.length} durationMs={turn.thinkingMs} />
        {turn.toolSteps.map((s) => <ToolStep key={s.toolUseId} step={s} />)}
        <AnswerMarkdown text={turn.answer} />
        {turn.status === "error" && turn.errorMessage && (
          <div className="text-[10px] text-[#e26b4a] font-mono mt-1">error: {turn.errorMessage}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `Conversation.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { Turn as TurnT } from "../../lib/agent-types";
import { Turn } from "./Turn";

export function Conversation({ turns }: { turns: TurnT[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [turns]);
  if (turns.length === 0) return null;
  return (
    <div
      ref={ref}
      className="bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.18)] rounded-md px-3 py-2 mb-2 max-h-[50vh] overflow-y-auto"
    >
      {turns.map((t) => <Turn key={t.id} turn={t} />)}
    </div>
  );
}
```

- [ ] **Step 6: `ChatInput.tsx`** (replicates the original ChatBar input form)

```tsx
"use client";
import { useState } from "react";

interface Props { onSubmit: (msg: string) => void; busy: boolean; }

export function ChatInput({ onSubmit, busy }: Props) {
  const [value, setValue] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !value.trim()) return;
    onSubmit(value);
    setValue("");
  };
  return (
    <form onSubmit={submit} className="bg-[rgba(10,12,22,0.85)] backdrop-blur-md border border-[rgba(140,160,200,0.18)] rounded-md flex items-center px-3 py-2 shadow-xl">
      <span className="text-[#5a78a0] font-mono text-xs mr-2">›</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={busy ? "thinking…" : "Ask CSAIL anything…"}
        disabled={busy}
        className="flex-1 bg-transparent outline-none text-[#d0d8e4] text-[11px] font-mono placeholder-[#7a8aa0] disabled:opacity-50"
      />
    </form>
  );
}
```

- [ ] **Step 7: `ChatPanel.tsx`** (top-level)

```tsx
"use client";
import { useAgentStream } from "../../hooks/useAgentStream";
import { Conversation } from "./Conversation";
import { ChatInput } from "./ChatInput";

export function ChatPanel() {
  const { turns, busy, send } = useAgentStream();
  return (
    <div className="absolute bottom-4 left-4 right-44 z-30">
      <Conversation turns={turns} />
      <ChatInput onSubmit={send} busy={busy} />
    </div>
  );
}
```

- [ ] **Step 8: Type-check**

```bash
cd frontend && bun x tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/datct/CSProjects/Hackathons/csail-complete
git add frontend/components/chat/ThinkingBlock.tsx frontend/components/chat/ToolStep.tsx frontend/components/chat/AnswerMarkdown.tsx frontend/components/chat/Turn.tsx frontend/components/chat/Conversation.tsx frontend/components/chat/ChatInput.tsx frontend/components/chat/ChatPanel.tsx
git commit -m "chat: UI components — ThinkingBlock, ToolStep, AnswerMarkdown, Turn, Conversation, ChatInput, ChatPanel"
```

---

## Task 6: Wire ChatPanel into the page + remove ChatBar + end-to-end test

**Files:**
- Modify: `frontend/app/page.tsx`
- Delete: `frontend/components/chat/ChatBar.tsx`

- [ ] **Step 1: Read current page.tsx**

```bash
cat frontend/app/page.tsx
```

- [ ] **Step 2: Replace `ChatBar` import and usage with `ChatPanel`**

Edit `frontend/app/page.tsx`: change `import { ChatBar }` → `import { ChatPanel }` (path stays under `@/components/chat/`) and change `<ChatBar />` → `<ChatPanel />`.

- [ ] **Step 3: Delete `ChatBar.tsx`**

```bash
rm frontend/components/chat/ChatBar.tsx
```

- [ ] **Step 4: Restart dev server** so it picks up the new env vars

If dev server is currently running, kill and restart it with the env vars:

```bash
# Kill any running next dev process if needed:
lsof -t -i:3000 | xargs -r kill 2>/dev/null

# Start with env vars in scope (user must export these in their shell first):
cd frontend && bun dev > /tmp/next-dev.log 2>&1 &
sleep 5
```

(If `AWS_BEARER_TOKEN_BEDROCK` etc. aren't already exported in the user's shell, surface this as a NEEDS_CONTEXT — we cannot guess the value.)

- [ ] **Step 5: End-to-end live test in browser**

Visit http://localhost:3000. You should see the existing 3D scene. Click the input bar at bottom-left, type "who is on floor 7?" and press Enter.

Expected behavior:
- A conversation panel slides up showing the user message
- "thinking…" appears immediately
- Within ~3-5s, a `find_people_on_floor` tool step appears with a green dot when complete
- Final answer text streams in below
- Thinking accordion auto-collapses

If it works: try the other 4 demo queries from the spec.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/page.tsx frontend/components/chat/ChatBar.tsx
git commit -m "chat: replace ChatBar with streaming ChatPanel; wire into page"
```

- [ ] **Step 7: Push everything**

```bash
git push origin main
```

---

## Self-review notes

- **Spec coverage**: every spec item is mapped to a task — deps + tools, SSE + system + tool registry, agent loop + route, frontend hook + types + SSE client, UI components, page wiring. ✓
- **Type consistency**: `AgentEvent` shape matches the SSE writer's emit calls; `ToolStepState` flows from hook → ToolStep component without divergence. ✓
- **No placeholders**: every step has complete code. ✓
- **Streaming verification**: Step 3-3 has a curl test that proves SSE events flow before the UI is built — early failure detection. ✓
- **Aesthetic continuity**: all new components reuse the same color tokens and spacing as `ChatBar.tsx` and the card components. ✓
