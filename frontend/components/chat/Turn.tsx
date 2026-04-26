"use client";
import type { Turn as TurnT } from "../../lib/agent-types";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolStep } from "./ToolStep";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { TurnReferences } from "./TurnReferences";

export function Turn({ turn, isLast }: { turn: TurnT; isLast?: boolean }) {
  return (
    <article className="py-3 first:pt-0 border-b border-[var(--rule)] last:border-b-0">
      {/* User message — right aligned bubble */}
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tr-sm font-body text-[13px] leading-snug"
          style={{
            background: "rgba(244,237,224,0.92)",
            color: "var(--ink)",
          }}
        >
          {turn.user}
        </div>
      </div>

      {/* Assistant scaffold + answer — left side, hairline rule */}
      <div className="pl-3 border-l border-[var(--rule-strong)]">
        <ThinkingBlock
          thinking={turn.thinking}
          status={turn.status}
          toolCount={turn.toolSteps.length}
          durationMs={turn.thinkingMs}
        />
        {turn.toolSteps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {turn.toolSteps.map((s) => <ToolStep key={s.toolUseId} step={s} />)}
          </div>
        )}
        <AnswerMarkdown text={turn.answer} streaming={turn.status === "running" && !!turn.answer} />
        <TurnReferences toolSteps={turn.toolSteps} />
        {turn.status === "error" && turn.errorMessage && (
          <div className="mt-2 font-mono text-[11px] text-[var(--cinnabar)] tabular">
            error · {turn.errorMessage}
          </div>
        )}
        {turn.status === "running" && !turn.answer && turn.toolSteps.length === 0 && (
          <div className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-[var(--graphite-2)] tabular animate-pulseSoft">
            <span>· · ·</span>
          </div>
        )}
      </div>
    </article>
  );
}
