interface ChatLauncherProps {
  onOpen: () => void;
}

export function ChatLauncher({ onOpen }: ChatLauncherProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open S.C.O.R.E. Guide chat: Need help getting started?"
      className="fixed bottom-6 right-6 z-50 flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
    >
      <span aria-hidden="true">&#128172;</span>
      <span>Need help getting started?</span>
    </button>
  );
}
