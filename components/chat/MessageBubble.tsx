import type { ChatMessage } from "@/lib/chat/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const sources = !isUser ? (message.sources ?? []) : [];
  const isUnconfirmed = !isUser && message.grounded === false;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <p
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
          }`}
        >
          {message.text}
        </p>
        {sources.length > 0 ? (
          <p className="mt-1 px-1 text-xs text-neutral-500 dark:text-neutral-400">
            Sources: {sources.map((source) => source.title).join(", ")}
          </p>
        ) : null}
        {isUnconfirmed ? (
          <p className="mt-1 px-1 text-xs italic text-neutral-500 dark:text-neutral-400">
            Not yet confirmed
          </p>
        ) : null}
      </div>
    </div>
  );
}
