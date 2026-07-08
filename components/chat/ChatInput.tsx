"use client";

import { forwardRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
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
    <div className="border-t border-neutral-200 dark:border-neutral-700">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
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
          placeholder="Type your question..."
          className="min-h-11 flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0 || isOverLimit}
          className="min-h-11 min-w-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <div className="flex items-center justify-between gap-3 px-3 pb-2 text-xs text-neutral-400 dark:text-neutral-500">
        <p>For your safety, please don&apos;t share passwords or payment details here.</p>
        {showLengthNotice ? (
          <p role="status" className={isOverLimit ? "text-red-600 dark:text-red-400" : ""}>
            {isOverLimit
              ? `${value.length - MAX_QUESTION_LENGTH} characters over the limit`
              : `${MAX_QUESTION_LENGTH - value.length} characters left`}
          </p>
        ) : null}
      </div>
    </div>
  );
});
