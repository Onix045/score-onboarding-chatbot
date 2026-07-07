"use client";

import { useEffect, useRef } from "react";
import { ErrorNotice } from "./ErrorNotice";
import { LoadingIndicator } from "./LoadingIndicator";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage, ChatStatus } from "@/lib/chat/types";

interface MessageListProps {
  messages: ChatMessage[];
  status: ChatStatus;
  onRetry: () => void;
}

export function MessageList({ messages, status, onRetry }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversation with S.C.O.R.E. Guide"
      className="flex-1 space-y-3 overflow-y-auto p-4"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {status === "loading" && <LoadingIndicator />}
      {status === "error" && <ErrorNotice onRetry={onRetry} />}
      <div ref={bottomRef} />
    </div>
  );
}
