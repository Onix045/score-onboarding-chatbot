"use client";

import { useCallback, useRef, useState } from "react";
import { WELCOME_MESSAGE } from "@/lib/chat/constants";
import type { ChatMessage, ChatPanelState, ChatStatus } from "@/lib/chat/types";
import type { ChatHistoryTurn, SourceCitation } from "@/lib/rag/types";
import { MAX_HISTORY_TURNS } from "@/lib/rag/validate";

// Caps how many messages the client keeps in memory/renders during a long
// demo session. The server independently caps and validates how much
// history it accepts (see MAX_HISTORY_TURNS) regardless of this cap.
const MAX_MESSAGES = 50;

export interface ChatReply {
  text: string;
  grounded: boolean;
  sources: SourceCitation[];
}

export type ReplyFn = (userText: string, history: ChatHistoryTurn[]) => Promise<ChatReply>;

async function defaultReplyFn(userText: string, history: ChatHistoryTurn[]): Promise<ChatReply> {
  const response = await fetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: userText, history }),
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

function appendMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const next = [...messages, message];
  if (next.length <= MAX_MESSAGES) return next;
  // Keep the welcome message plus the most recent messages, so a long
  // session doesn't grow the render/memory footprint without bound.
  return [next[0], ...next.slice(next.length - (MAX_MESSAGES - 1))];
}

function toHistory(messages: ChatMessage[]): ChatHistoryTurn[] {
  return messages
    .filter((message) => message.id !== WELCOME_MESSAGE.id)
    .slice(-MAX_HISTORY_TURNS)
    .map((message) => ({ role: message.role, text: message.text }));
}

interface UseChatControllerOptions {
  replyFn?: ReplyFn;
}

export function useChatController({ replyFn = defaultReplyFn }: UseChatControllerOptions = {}) {
  const [panelState, setPanelState] = useState<ChatPanelState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const pendingTextRef = useRef<string | null>(null);
  // Synchronous lock — React state updates batch, so relying on `status`
  // alone can't prevent two sends fired in the same tick.
  const isSendingRef = useRef(false);

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
        const reply = await replyFn(text, toHistory(messages));
        setMessages((prev) =>
          appendMessage(prev, {
            id: nextMessageId("assistant"),
            role: "assistant",
            text: reply.text,
            grounded: reply.grounded,
            sources: reply.sources,
          })
        );
        setStatus("idle");
        pendingTextRef.current = null;
      } catch {
        setStatus("error");
      } finally {
        isSendingRef.current = false;
      }
    },
    [replyFn, messages]
  );

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSendingRef.current) return;
      isSendingRef.current = true;

      pendingTextRef.current = trimmed;
      setMessages((prev) => appendMessage(prev, { id: nextMessageId("user"), role: "user", text: trimmed }));
      void attemptReply(trimmed);
    },
    [attemptReply]
  );

  const retry = useCallback(() => {
    const pending = pendingTextRef.current;
    if (!pending || isSendingRef.current) return;
    isSendingRef.current = true;
    void attemptReply(pending);
  }, [attemptReply]);

  return { panelState, messages, status, open, minimize, close, restart, sendText, retry };
}
