import { CloseIcon, MinimizeIcon, RestartIcon } from "./icons";

interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
  onRestart: () => void;
}

export function ChatHeader({ onMinimize, onClose, onRestart }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-t-2xl bg-cerulean-600 px-4 py-3 text-white sm:rounded-t-2xl">
      <div>
        <h2 className="text-base font-semibold">S.C.O.R.E. Guide</h2>
        <p className="text-xs text-cerulean-100">Here to help you get started</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart conversation"
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
