import type { ChatMessage } from "@/lib/chat/types";
import { cx, getChatTheme } from "@/lib/chat/theme";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const theme = getChatTheme();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <p
          className={cx(
            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm",
            isUser ? theme.colors.userBubble : theme.colors.assistantBubble
          )}
        >
          {message.text}
        </p>
      </div>
    </div>
  );
}
