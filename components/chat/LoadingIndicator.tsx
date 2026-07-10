"use client";

import { useEffect, useState } from "react";
import { CHAT_BRAND } from "@/lib/chat/brand";

// Long enough not to flicker on a normal fast reply, short enough that a
// genuinely slow one (retries, a cold start, a slow connection) gets a
// reassuring update before a first-time user assumes it's frozen.
const SLOW_RESPONSE_DELAY_MS = 4000;

export function LoadingIndicator() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_RESPONSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const label = isSlow ? CHAT_BRAND.slowTypingLabel : CHAT_BRAND.typingLabel;

  return (
    <div role="status" aria-label={label} className="flex w-fit flex-col gap-1">
      <div className="flex items-center gap-1 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
        <span className="sr-only">{label}</span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
      </div>
      {isSlow ? (
        <p aria-hidden="true" className="px-1 text-xs text-neutral-400 dark:text-neutral-500">
          {CHAT_BRAND.slowTypingText}
        </p>
      ) : null}
    </div>
  );
}
