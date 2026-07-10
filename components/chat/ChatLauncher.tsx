import { ChatBubbleIcon } from "./icons";
import { CHAT_BRAND } from "@/lib/chat/brand";

interface ChatLauncherProps {
  onOpen: () => void;
}

export function ChatLauncher({ onOpen }: ChatLauncherProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={CHAT_BRAND.launcherAriaLabel}
      className={`fixed bottom-6 right-6 z-50 flex min-h-14 items-center justify-center gap-2 rounded-full px-4 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${CHAT_BRAND.colors.launcher}`}
    >
      <ChatBubbleIcon className="h-6 w-6" />
      <span className="hidden text-sm font-medium sm:inline">{CHAT_BRAND.launcherLabel}</span>
    </button>
  );
}
