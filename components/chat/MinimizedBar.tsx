interface MinimizedBarProps {
  onExpand: () => void;
  onClose: () => void;
}

export function MinimizedBar({ onExpand, onClose }: MinimizedBarProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full bg-blue-600 pl-2 pr-1 text-white shadow-lg">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand S.C.O.R.E. Guide chat"
        className="min-h-11 rounded-full px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        S.C.O.R.E. Guide
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close chat"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span aria-hidden="true">&#215;</span>
      </button>
    </div>
  );
}
