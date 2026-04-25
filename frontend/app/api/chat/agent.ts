import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import type { MessageParam, ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import { SYSTEM_PROMPT } from "./system-prompt";
import { TOOL_SPECS, executeTool } from "./tools";
import type { SseWriter } from "./sse-server";

const MODEL = process.env["BEDROCK_MODEL_ID"] ?? "us.anthropic.claude-sonnet-4-6";
const MAX_ITERATIONS = 5;
const THINKING_BUDGET = 4000;
const MAX_TOKENS = 8000;

const client = new AnthropicBedrock({
  awsRegion: process.env["AWS_REGION"] ?? "us-east-1",
});

export async function runAgentLoop(opts: { messages: MessageParam[]; writer: SseWriter }): Promise<void> {
  const { messages, writer } = opts;
  const turnId = crypto.randomUUID();
  writer.event("turn_start", { turnId });

  const conversation: MessageParam[] = [...messages];

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      thinking: { type: "enabled", budget_tokens: THINKING_BUDGET },
      tools: TOOL_SPECS as never,
      messages: conversation,
    });

    const pendingToolUses: Array<{ id: string; name: string }> = [];

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "tool_use") {
          pendingToolUses.push({ id: block.id, name: block.name });
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
            writer.event("input_json_delta", { toolUseId: tu.id, partialJson: delta.partial_json });
          }
        }
      }
    }

    const finalMessage = await stream.finalMessage();
    const stopReason = finalMessage.stop_reason;
    conversation.push({ role: "assistant", content: finalMessage.content });

    const toolUses = finalMessage.content.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");
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
