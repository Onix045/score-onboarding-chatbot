import { CHAT_BRAND } from "@/lib/chat/brand";

interface ErrorNoticeProps {
  onRetry: () => void;
}

export function ErrorNotice({ onRetry }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      <p>Something went wrong. Please try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className={`min-h-11 rounded-lg border border-red-300 px-3 text-sm font-medium text-red-700 focus-visible:outline-none focus-visible:ring-2 ${CHAT_BRAND.colors.focusRing} dark:border-red-700 dark:text-red-200`}
      >
        Retry
      </button>
    </div>
  );
}
