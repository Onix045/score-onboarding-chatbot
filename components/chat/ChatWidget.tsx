"use client";

import { useEffect, useRef } from "react";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatLauncher } from "./ChatLauncher";
import { MessageList } from "./MessageList";
import { MinimizedBar } from "./MinimizedBar";
import { QuickActions } from "./QuickActions";
import { QUICK_ACTIONS } from "@/lib/chat/constants";
import { useChatController } from "@/hooks/useChatController";
import type { QuickAction } from "@/lib/chat/types";

export function ChatWidget() {
  const { panelState, messages, status, open, minimize, close, restart, sendText, retry } =
    useChatController();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (panelState === "open") {
      inputRef.current?.focus();
    }
  }, [panelState]);

  function handleQuickAction(action: QuickAction) {
    sendText(action.label);
  }

  if (panelState === "closed") {
    return <ChatLauncher onOpen={open} />;
  }

  if (panelState === "minimized") {
    return <MinimizedBar onExpand={open} onClose={close} />;
  }

  return (
    <div
      role="dialog"
      aria-label="S.C.O.R.E. Guide chat"
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-900 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-96 sm:rounded-2xl sm:border sm:border-neutral-200 sm:shadow-2xl sm:dark:border-neutral-700"
    >
      <ChatHeader onMinimize={minimize} onClose={close} onRestart={restart} />
      <MessageList messages={messages} status={status} onRetry={retry} />
      <QuickActions actions={QUICK_ACTIONS} disabled={status === "loading"} onSelect={handleQuickAction} />
      <ChatInput ref={inputRef} disabled={status === "loading"} onSend={sendText} />
    </div>
  );
}
