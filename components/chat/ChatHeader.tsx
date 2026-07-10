import { CloseIcon, MinimizeIcon, RestartIcon } from "./icons";
import { cx, getChatTheme } from "@/lib/chat/theme";

interface ChatHeaderProps {
  onClearHistory: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export function ChatHeader({ onClearHistory, onMinimize, onClose }: ChatHeaderProps) {
  const theme = getChatTheme();

  return (
    <div
      className={cx(
        "flex items-center justify-between gap-2 rounded-t-2xl px-4 py-3 sm:rounded-t-2xl",
        theme.colors.header
      )}
    >
      <div>
        <h2 className="text-base font-semibold">{theme.displayName}</h2>
        <p className={cx("text-xs", theme.colors.headerSubtitle)}>{theme.subtitle}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClearHistory}
          aria-label="Clear chat history"
          title="Clear chat history"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RestartIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimize chat"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <MinimizeIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
