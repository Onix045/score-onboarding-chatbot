import type { ChatMessage, QuickAction } from "./types";

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Welcome to S.C.O.R.E. I'm your setup guide. I can explain how S.C.O.R.E. works or help you practice your first setup. You don't need technical experience.",
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "setup-first-product", label: "Set up my first product" },
  { id: "what-can-score-do", label: "What can S.C.O.R.E. do?" },
  { id: "practice-sale", label: "Practice recording a sale" },
  { id: "ask-a-question", label: "Ask a question" },
];
