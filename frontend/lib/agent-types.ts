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
  input: string;
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
