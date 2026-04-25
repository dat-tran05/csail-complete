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
