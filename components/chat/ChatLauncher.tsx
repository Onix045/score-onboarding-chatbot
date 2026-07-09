import { ChatBubbleIcon } from "./icons";

interface ChatLauncherProps {
  onOpen: () => void;
}

export function ChatLauncher({ onOpen }: ChatLauncherProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open S.C.O.R.E. Guide chat: Need help getting started?"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-cerulean-600 text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cerulean-500"
    >
      <ChatBubbleIcon className="h-6 w-6" />
    </button>
  );
}
