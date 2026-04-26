"use client";
import { useState } from "react";
import { useAgentStream } from "../../hooks/useAgentStream";
import { Conversation } from "./Conversation";
import { ChatInput } from "./ChatInput";
import { QuickPrompts } from "./QuickPrompts";

export function ChatPanel() {
  const { turns, busy, send } = useAgentStream();
  const [collapsed, setCollapsed] = useState(false);
  const empty = turns.length === 0;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(720px,calc(100%-3rem))] flex flex-col gap-2 pointer-events-auto">
      {!empty && !collapsed && <Conversation turns={turns} />}
      {empty && <QuickPrompts onPick={send} />}
      <ChatInput
        onSubmit={send}
        busy={busy}
        showCollapse={!empty}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
    </div>
  );
}
