"use client";

import { forwardRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { CHAT_BRAND } from "@/lib/chat/brand";
import { MAX_QUESTION_LENGTH } from "@/lib/rag/validate";

const LENGTH_WARNING_THRESHOLD = Math.round(MAX_QUESTION_LENGTH * 0.8);

interface ChatInputProps {
  disabled?: boolean;
  onSend: (text: string) => void;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput(
  { disabled, onSend },
  ref
) {
  const [value, setValue] = useState("");
  const isOverLimit = value.length > MAX_QUESTION_LENGTH;
  const showLengthNotice = value.length >= LENGTH_WARNING_THRESHOLD;
  const canSend = !disabled && value.trim().length > 0 && !isOverLimit;

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || trimmed.length > MAX_QUESTION_LENGTH) return;
    onSend(trimmed);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 border-t border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white py-2 pl-4 pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
      >
        <label htmlFor="chat-message-input" className="sr-only">
          Type your message
        </label>
        <textarea
          ref={ref}
          id="chat-message-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          autoComplete="off"
          placeholder="Type your question..."
          className="min-h-11 flex-1 resize-none bg-transparent py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-none disabled:opacity-60 dark:text-neutral-100 dark:placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${CHAT_BRAND.colors.userBubble} focus-visible:outline-none focus-visible:ring-2 ${CHAT_BRAND.colors.focusRing} disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-500`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M3.4 20.6 21 12 3.4 3.4 3 10l13 2-13 2z" />
          </svg>
        </button>
      </form>
      {showLengthNotice ? (
        <p
          role="status"
          className={`mt-1 px-2 text-xs ${
            isOverLimit ? "text-red-600 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {isOverLimit
            ? `${value.length - MAX_QUESTION_LENGTH} characters over the limit`
            : `${MAX_QUESTION_LENGTH - value.length} characters left`}
        </p>
      ) : null}
    </div>
  );
});
