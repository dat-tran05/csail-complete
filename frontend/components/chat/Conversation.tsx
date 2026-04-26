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
      className="rounded-3xl px-5 py-4 max-h-[52vh] overflow-y-auto animate-fadeUp"
      style={{
        background: "linear-gradient(180deg, rgba(244,237,224,0.04) 0%, rgba(12,14,19,0.92) 100%)",
        border: "1px solid var(--rule-strong)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(244,237,224,0.06)",
      }}
    >
      {turns.map((t, i) => <Turn key={t.id} turn={t} isLast={i === turns.length - 1} />)}
    </div>
  );
}
