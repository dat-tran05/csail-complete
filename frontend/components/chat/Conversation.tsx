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
