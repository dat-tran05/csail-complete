# Streaming CoT Chat via AWS Bedrock — Design Spec

**Date:** 2026-04-25
**Author:** Dat Tran (with Claude)
**Status:** Approved
**Companion to:** KG Neo4j spec/plan, Floor 7 viz plan

## Goal

Replace the current `ChatBar` (single-shot stub) with a streaming chain-of-thought chat that calls Claude Sonnet 4.6 via AWS Bedrock, executes Neo4j-backed tools in a loop, and renders thinking + tool calls + final answer live in the existing CSAIL glassmorphic HUD aesthetic.

## Locked-in decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | `@anthropic-ai/bedrock-sdk` (not Claude Agent SDK, not raw AWS SDK) | Proven by reference (`trip-doc-agent`); supports Bedrock + thinking + tool use + streaming with one API. Auth via `AWS_BEARER_TOKEN_BEDROCK` env var picked up automatically. |
| 2 | Model: `us.anthropic.claude-sonnet-4-6` (cross-region inference profile, us-east-1) | User-specified. Latest Sonnet, supports extended thinking + tool use. |
| 3 | Extended thinking: `budget_tokens: 4000` | Enough to plan 2-3 tool calls; bounded so latency stays demo-friendly. |
| 4 | Tool loop: max 5 iterations | Hard cap to prevent runaway. Floor 7 demo questions resolve in 1-3 iterations. |
| 5 | Streaming protocol: SSE | Browser-native via `EventSource`. Pattern lifted from trip-doc-agent. |
| 6 | Stateless per request | Demo simplicity. Frontend keeps full conversation in component state and passes `history` on each request. |
| 7 | Visual: extend CSAIL aesthetic, do NOT lift trip-doc-agent's UI components verbatim | User likes the glassmorphic HUD; keep visual vocabulary consistent with FloorCard/RoomCard. |
| 8 | Lift trip-doc-agent's logic wholesale: `useAgentStream` hook, SSE parser, agent loop pattern | Battle-tested; saves time. |

## Architecture

```
┌───────────────────────────────────┐
│ ChatPanel (frontend, new)         │
│  ├── Conversation (scrollable)    │
│  │    └── Turn[]                  │
│  │         ├── UserBubble         │
│  │         ├── ThinkingBlock      │
│  │         ├── ToolStep[]         │
│  │         └── AnswerMarkdown     │
│  └── ChatInput (bottom, glass)    │
│       │  POST + SSE stream        │
└───────┼───────────────────────────┘
        ▼
┌───────────────────────────────────┐
│ /api/chat (route.ts, replaced)    │
│  ├── AnthropicBedrock client      │
│  ├── ConverseStream + thinking    │
│  ├── Tool registry → agents/kg/   │
│  └── SSE event writer             │
└───────┼───────────────────────────┘
        ▼
┌───────────────────────────────────┐
│ Neo4j (1493 ppl + 1877 papers)    │
└───────────────────────────────────┘
```

## SSE event vocabulary

Mirrors trip-doc-agent. Each event is `event: <name>\ndata: <json>\n\n`:

| Event | Payload | When |
|---|---|---|
| `turn_start` | `{ turnId }` | Start of one user→agent turn |
| `thinking_delta` | `{ delta: string }` | Each chunk of extended thinking text |
| `text_delta` | `{ delta: string }` | Each chunk of assistant text |
| `tool_use_start` | `{ toolUseId, name }` | Start of a tool call (input streams via input_json_delta) |
| `input_json_delta` | `{ toolUseId, partialJson: string }` | Streaming tool input |
| `tool_result` | `{ toolUseId, status: "ok" \| "error", result: any, durationMs }` | After tool execution |
| `turn_end` | `{ turnId, stopReason }` | End of turn |
| `error` | `{ message }` | Hard error |
| `done` | `{}` | Stream complete |

## Tools exposed to the model

All wrap functions in `agents/kg/tools/`. Tool spec format follows Anthropic Messages API.

| Tool name | Args | Returns | Existing? |
|---|---|---|---|
| `find_people_on_floor` | `floor: int` | `FloorPerson[]` | yes |
| `get_floor_summary` | `floor: int` | `{ totalPeople, piCount, groupCount, paperCount }` | yes |
| `get_person_profile` | `nodeId: string` | `PersonProfile` | yes |
| `search_people` | `query: string, limit?: int` | `{ nodeId, name, title, room?, groups[] }[]` | new |
| `find_coauthors` | `nodeId: string, limit?: int` | `{ nodeId, name, paperCount, firstYear, lastYear }[]` | new |
| `recent_news_for_person` | `nodeId: string, limit?: int` | `{ title, publishedAt, url, excerpt }[]` | new |

## System prompt

```
You are a knowledgeable guide to the MIT CSAIL knowledge graph, focused on the
Stata Center building. The current demo surfaces Floor 7 (the G-wing of floor 7),
which houses research groups including the HCI Lab, Visualization Group,
Computer-Aided Programming, Computation Structures, Theory of Computation, and more.

You have tools to query a Neo4j graph populated from the CSAIL directory (1,493 people),
Semantic Scholar (1,877+ papers, with deep coverage for the Floor 7 cohort), and
CSAIL news (407 articles). When a user asks about people, groups, projects, papers,
or rooms, prefer calling tools over guessing.

Decompose broad questions into specific lookups. When citing people or groups, use
their canonical names from the graph. Keep answers concise and grounded — never
fabricate identifiers, room numbers, paper titles, or news headlines.

If a person's CSAIL profile hasn't been updated in years (the graph marks them
`stale: true`), mention that briefly when surfacing them.
```

## Backend route shape

`frontend/app/api/chat/route.ts`:

```ts
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const { messages } = await req.json();
  const stream = new ReadableStream({
    async start(controller) {
      const writer = sseWriter(controller);
      try {
        await runAgentLoop({ messages, writer });
        writer.event("done", {});
      } catch (e) {
        writer.event("error", { message: String(e) });
      } finally {
        controller.close();
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

The agent loop:
1. Initialize `AnthropicBedrock` client (env-based auth).
2. For up to 5 iterations:
   a. Call `client.messages.stream({ model, system, messages, tools, thinking: { type: "enabled", budget_tokens: 4000 } })`
   b. Iterate stream events: emit `thinking_delta`, `text_delta`, `tool_use_start`, `input_json_delta` to SSE writer
   c. Collect tool_use blocks. If none, break.
   d. Execute each tool, emit `tool_result`, append `tool_result` blocks to messages, continue.
3. Emit `turn_end`.

## Frontend file layout

```
frontend/
├── components/chat/
│   ├── ChatPanel.tsx           [NEW — top-level, replaces ChatBar in page.tsx]
│   ├── ChatInput.tsx           [NEW — bottom input bar, current ChatBar aesthetic preserved]
│   ├── Conversation.tsx        [NEW — scrollable list of turns, anchored above input]
│   ├── Turn.tsx                [NEW — composes user bubble + thinking + tools + answer]
│   ├── ThinkingBlock.tsx       [NEW — collapsed accordion, "Thought for Xs"]
│   ├── ToolStep.tsx            [NEW — tool name, status, input/result preview]
│   ├── AnswerMarkdown.tsx      [NEW — renders final answer with markdown]
│   └── ChatBar.tsx             [DELETE]
├── hooks/
│   └── useAgentStream.ts       [NEW — adapted from trip-doc-agent]
├── lib/
│   ├── sse-client.ts           [NEW — SSE async generator]
│   └── agent-types.ts          [NEW — AgentEvent discriminated union]
└── app/api/chat/
    ├── route.ts                [REPLACE — Bedrock streaming agent]
    ├── agent.ts                [NEW — agent loop logic]
    ├── tools.ts                [NEW — tool registry, JSON schemas]
    ├── system-prompt.ts        [NEW — system prompt string]
    └── sse-server.ts           [NEW — SSE writer wrapping ReadableStreamController]
```

## New KG tools to add

`agents/kg/tools/search.ts`:
```ts
export async function searchPeople(query: string, limit = 10): Promise<...>
```

Append to `agents/kg/tools/person.ts`:
```ts
export async function findCoauthors(nodeId: string, limit = 10): Promise<...>
export async function recentNewsForPerson(nodeId: string, limit = 5): Promise<...>
```

## Visual design (CSAIL HUD-style)

Adapt existing tokens from `FloorCard`/`RoomCard`:
- Backgrounds: `rgba(10,12,22,0.85)` with `backdrop-blur-md`
- Borders: `rgba(140,160,200,0.18)`
- Text: `#d0d8e4` (primary), `#a8b8d0` (secondary), `#7a8aa0` (muted), `#5a78a0` (accent)
- Font: monospace throughout, `text-[10px]` to `text-[12px]`
- Animations: subtle (fade/slide), 200ms

`ThinkingBlock`:
- Collapsed bar: `▸ Thought for 3.2s · 4 tool calls` (clickable)
- Expanded: scrollable italic muted text below

`ToolStep`:
- One row per call: status dot (`◯` running, `●` done, `✕` error) + tool name + abbreviated input + abbreviated result
- Click to expand full JSON (collapsed by default)

`Conversation`:
- Max-height: `50vh`, scrollable
- Slides in/out based on `turns.length > 0`
- Sits above `ChatInput`

## Demo script (test these queries end-to-end)

1. "Who's on floor 7?" — exercises `find_people_on_floor` + `get_floor_summary`
2. "What does Armando Solar-Lezama work on?" — exercises `get_person_profile`
3. "Find me an HCI researcher" — exercises `search_people` + maybe `get_person_profile`
4. "Who collaborates with Daniel Jackson?" — exercises `search_people` then `find_coauthors`
5. "What's recent news about HCI Lab?" — exercises `search_people` (or `get_group`) + `recent_news_for_person`

## Out of scope

- Multi-turn memory beyond the single page session
- Server-side session storage
- Chat history persistence
- Voice/audio
- Multimodal inputs (images of rooms etc.) — KG-only for demo

## Risks

| Risk | Mitigation |
|---|---|
| Bedrock returns 4xx because bearer token is missing/invalid | Frontend route catches and emits `error` event with the AWS error message; UI shows it. |
| Tool returns large blob that blows past context | Tool wrappers cap result size (e.g. `recentPapers` already top-10) |
| Streaming gets buffered by Next dev server proxy | `X-Accel-Buffering: no` header + `Cache-Control: no-transform` to defeat buffering |
| Extended thinking + tool use combo not supported on `us.anthropic.claude-sonnet-4-6` | Fallback: disable thinking and use plain tool loop. Likely won't hit — Sonnet 4.6 supports both per AWS docs. |
| ReadableStream + Next.js 16 app router quirks | trip-doc-agent uses Express, not App Router; we'll write the SSE server adapter ourselves and verify it streams (not buffers) early in the implementation. |
