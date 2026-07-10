import type { QuickAction } from "@/lib/chat/types";
import { CHAT_BRAND } from "@/lib/chat/brand";

interface QuickActionsProps {
  actions: QuickAction[];
  disabled?: boolean;
  onSelect: (action: QuickAction) => void;
}

export function QuickActions({ actions, disabled, onSelect }: QuickActionsProps) {
  return (
    <div
      aria-label="Quick actions"
      className="shrink-0 flex flex-wrap gap-2 border-t border-neutral-200 p-3 dark:border-neutral-700"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(action)}
          className={`min-h-11 rounded-full border border-neutral-300 px-3 text-sm text-neutral-700 focus-visible:outline-none focus-visible:ring-2 ${CHAT_BRAND.colors.focusRing} disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
