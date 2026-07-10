"use client";

import { useEffect, useRef } from "react";
import { ErrorNotice } from "./ErrorNotice";
import { LoadingIndicator } from "./LoadingIndicator";
import { MessageBubble } from "./MessageBubble";
import { StarterQuestions } from "./StarterQuestions";
import type { ChatMessage, ChatStatus } from "@/lib/chat/types";

interface MessageListProps {
  messages: ChatMessage[];
  status: ChatStatus;
  onRetry: () => void;
  onStarterQuestion: (question: string) => void;
}

export function MessageList({ messages, status, onRetry, onStarterQuestion }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const showStarterQuestions = messages.length === 1 && status !== "loading";

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, status]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversation with S.C.O.R.E. Guide"
      className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 pr-2"
      style={{ scrollbarGutter: "stable" }}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {showStarterQuestions ? (
        <StarterQuestions onSelect={onStarterQuestion} />
      ) : null}
      {status === "loading" && <LoadingIndicator />}
      {status === "error" && <ErrorNotice onRetry={onRetry} />}
      <div ref={bottomRef} />
    </div>
  );
}
