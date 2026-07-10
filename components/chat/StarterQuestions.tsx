"use client";

import { DEFAULT_SUGGESTED_REPLIES } from "@/lib/chat/brand";
import { getChatTheme } from "@/lib/chat/theme";

interface StarterQuestionsProps {
  disabled?: boolean;
  onSelect: (question: string) => void;
}

export function StarterQuestions({ disabled, onSelect }: StarterQuestionsProps) {
  const theme = getChatTheme();

  return (
    <div className="space-y-2 pl-1" aria-label="Suggested starter questions">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Try asking:</p>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_SUGGESTED_REPLIES.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className={`min-h-9 rounded-full border border-neutral-300 px-3 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 ${theme.colors.focusRing} disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200`}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
