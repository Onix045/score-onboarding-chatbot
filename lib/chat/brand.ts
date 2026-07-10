export const CHAT_BRAND = {
  displayName: "S.C.O.R.E. Guide",
  subtitle: "Here to help you get started",
  launcherLabel: "Ask S.C.O.R.E. Guide",
  launcherAriaLabel: "Open S.C.O.R.E. Guide chat: Need help getting started?",
  welcomeText:
    "Welcome to S.C.O.R.E. I'm your setup guide. I can explain how S.C.O.R.E. works or help you practice your first setup. You don't need technical experience.",
  typingLabel: "S.C.O.R.E. Guide is typing",
  slowTypingLabel: "Still working on your answer",
  slowTypingText: "Still working on it - thanks for waiting.",
  colors: {
    header: "bg-cerulean-600 text-white",
    headerSubtitle: "text-cerulean-100",
    launcher: "bg-cerulean-600 text-white focus-visible:ring-cerulean-500",
    userBubble: "bg-blue-600 text-white",
    assistantBubble: "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
    focusRing: "focus-visible:ring-blue-500",
  },
} as const;

export const DEFAULT_SUGGESTED_REPLIES = [
  "Where should I start?",
  "What is inventory tracking?",
  "How do I record a sale?",
] as const;
