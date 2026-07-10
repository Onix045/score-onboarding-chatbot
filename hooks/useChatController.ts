"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WELCOME_MESSAGE } from "@/lib/chat/constants";
import type { ChatMessage, ChatPanelState, ChatStatus } from "@/lib/chat/types";
import type { ChatHistoryTurn, SourceCitation } from "@/lib/rag/types";
import { MAX_HISTORY_TURNS } from "@/lib/rag/validate";

// Caps how many messages the client keeps in memory/renders during a long
// demo session. The server independently caps and validates how much
// history it accepts (see MAX_HISTORY_TURNS) regardless of this cap.
const MAX_MESSAGES = 50;
const CHAT_STORAGE_KEY = "score-chat-history-v1";

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

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<ChatMessage>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.text === "string" &&
    message.text.trim().length > 0
  );
}

function normalizeStoredMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [WELCOME_MESSAGE];
  const validMessages = value.filter(isChatMessage).slice(-MAX_MESSAGES);
  const conversationMessages = validMessages
    .filter((message) => message.id !== WELCOME_MESSAGE.id)
    .slice(-(MAX_MESSAGES - 1));
  return [WELCOME_MESSAGE, ...conversationMessages];
}

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [WELCOME_MESSAGE];

  try {
    const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) return [WELCOME_MESSAGE];
    return normalizeStoredMessages(JSON.parse(stored));
  } catch {
    return [WELCOME_MESSAGE];
  }
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
  const [messages, setMessages] = useState<ChatMessage[]>(loadStoredMessages);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const pendingTextRef = useRef<string | null>(null);
  // Synchronous lock — React state updates batch, so relying on `status`
  // alone can't prevent two sends fired in the same tick.
  const isSendingRef = useRef(false);
  // Mirrors `messages`, updated synchronously in the same call as
  // setMessages (not via an effect, so there's no render-timing question).
  // Lets attemptReply read the current conversation without depending on
  // `messages`, so its identity — and sendText/retry's — stays stable
  // across a session instead of being recreated on every message.
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      if (messages.length <= 1) {
        window.localStorage.removeItem(CHAT_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage can fail in private browsing or locked-down environments.
      // Chat still works in memory, so ignore persistence failures.
    }
  }, [messages]);

  function updateMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }

  const open = useCallback(() => setPanelState("open"), []);
  const minimize = useCallback(() => setPanelState("minimized"), []);
  const close = useCallback(() => setPanelState("closed"), []);

  const restart = useCallback(() => {
    updateMessages(() => [WELCOME_MESSAGE]);
    setStatus("idle");
    pendingTextRef.current = null;
  }, []);

  const attemptReply = useCallback(
    async (text: string, history: ChatHistoryTurn[]) => {
      setStatus("loading");
      try {
        const reply = await replyFn(text, history);
        updateMessages((prev) =>
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
    [replyFn]
  );

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSendingRef.current) return;
      isSendingRef.current = true;

      pendingTextRef.current = trimmed;
      // Snapshot history from the ref before appending this message —
      // history must exclude the message being sent, which arrives at
      // replyFn as the separate `text` argument.
      const history = toHistory(messagesRef.current);
      updateMessages((prev) => appendMessage(prev, { id: nextMessageId("user"), role: "user", text: trimmed }));
      void attemptReply(trimmed, history);
    },
    [attemptReply]
  );

  const retry = useCallback(() => {
    const pending = pendingTextRef.current;
    if (!pending || isSendingRef.current) return;
    isSendingRef.current = true;
    void attemptReply(pending, toHistory(messagesRef.current));
  }, [attemptReply]);

  return { panelState, messages, status, open, minimize, close, restart, sendText, retry };
}
