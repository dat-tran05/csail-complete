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
