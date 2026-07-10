"use client";

import { useEffect, useRef } from "react";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatLauncher } from "./ChatLauncher";
import { MessageList } from "./MessageList";
import { MinimizedBar } from "./MinimizedBar";
import { OnboardingCard } from "./OnboardingCard";
import { QuickActions } from "./QuickActions";
import { QUICK_ACTIONS } from "@/lib/chat/constants";
import { useChatController } from "@/hooks/useChatController";
import { useOnboardingController } from "@/hooks/useOnboardingController";
import type { QuickAction } from "@/lib/chat/types";

const ONBOARDING_QUICK_ACTION_IDS = new Set(["setup-first-product", "practice-sale"]);

export function ChatWidget() {
  const { panelState, messages, status, open, minimize, close, restart, sendText, retry } = useChatController();
  const onboarding = useOnboardingController();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (panelState === "open") {
      inputRef.current?.focus();
    }
  }, [panelState]);

  function handleQuickAction(action: QuickAction) {
    if (action.id === "ask-a-question") {
      inputRef.current?.focus();
      return;
    }
    if (ONBOARDING_QUICK_ACTION_IDS.has(action.id)) {
      onboarding.start();
      return;
    }
    sendText(action.label);
  }

  function handleClearHistory() {
    restart();
    onboarding.exit();
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
      className="fixed inset-0 z-50 flex min-h-0 flex-col bg-white dark:bg-neutral-900 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-96 sm:rounded-2xl sm:border sm:border-neutral-200 sm:shadow-2xl sm:dark:border-neutral-700"
    >
      <ChatHeader onClearHistory={handleClearHistory} onMinimize={minimize} onClose={close} />
      <MessageList messages={messages} status={status} onRetry={retry} onStarterQuestion={sendText} />
      {onboarding.active ? (
        <OnboardingCard onboarding={onboarding} />
      ) : (
        <>
          <QuickActions actions={QUICK_ACTIONS} disabled={status === "loading"} onSelect={handleQuickAction} />
          <ChatInput ref={inputRef} disabled={status === "loading"} onSend={sendText} />
        </>
      )}
    </div>
  );
}
