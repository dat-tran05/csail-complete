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
