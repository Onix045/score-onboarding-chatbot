"use client";

import { useCallback, useRef, useState } from "react";
import { WELCOME_MESSAGE } from "@/lib/chat/constants";
import type { ChatMessage, ChatPanelState, ChatStatus } from "@/lib/chat/types";
import type { SourceCitation } from "@/lib/rag/types";

export interface ChatReply {
  text: string;
  grounded: boolean;
  sources: SourceCitation[];
}

export type ReplyFn = (userText: string) => Promise<ChatReply>;

async function defaultReplyFn(userText: string): Promise<ChatReply> {
  const response = await fetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: userText }),
  });

  if (!response.ok) {
    throw new Error(`Support request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { answer: string; grounded: boolean; sources: SourceCitation[] };
  return { text: data.answer, grounded: data.grounded, sources: data.sources };
}

let messageCounter = 0;
function nextMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

interface UseChatControllerOptions {
  replyFn?: ReplyFn;
}

export function useChatController({ replyFn = defaultReplyFn }: UseChatControllerOptions = {}) {
  const [panelState, setPanelState] = useState<ChatPanelState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const pendingTextRef = useRef<string | null>(null);

  const open = useCallback(() => setPanelState("open"), []);
  const minimize = useCallback(() => setPanelState("minimized"), []);
  const close = useCallback(() => setPanelState("closed"), []);

  const restart = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setStatus("idle");
    pendingTextRef.current = null;
  }, []);

  const attemptReply = useCallback(
    async (text: string) => {
      setStatus("loading");
      try {
        const reply = await replyFn(text);
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId("assistant"),
            role: "assistant",
            text: reply.text,
            grounded: reply.grounded,
            sources: reply.sources,
          },
        ]);
        setStatus("idle");
        pendingTextRef.current = null;
      } catch {
        setStatus("error");
      }
    },
    [replyFn]
  );

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "loading") return;

      pendingTextRef.current = trimmed;
      setMessages((prev) => [...prev, { id: nextMessageId("user"), role: "user", text: trimmed }]);
      void attemptReply(trimmed);
    },
    [attemptReply, status]
  );

  const retry = useCallback(() => {
    const pending = pendingTextRef.current;
    if (!pending) return;
    void attemptReply(pending);
  }, [attemptReply]);

  return { panelState, messages, status, open, minimize, close, restart, sendText, retry };
}
