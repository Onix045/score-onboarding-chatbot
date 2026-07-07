"use client";

import { useCallback, useRef, useState } from "react";
import { WELCOME_MESSAGE } from "@/lib/chat/constants";
import { getMockReplyText } from "@/lib/chat/mockResponses";
import type { ChatMessage, ChatPanelState, ChatStatus } from "@/lib/chat/types";

const MOCK_REPLY_DELAY_MS = 400;

export type ReplyFn = (userText: string) => Promise<string>;

async function defaultReplyFn(userText: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_REPLY_DELAY_MS));
  return getMockReplyText(userText);
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
        const replyText = await replyFn(text);
        setMessages((prev) => [...prev, { id: nextMessageId("assistant"), role: "assistant", text: replyText }]);
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
