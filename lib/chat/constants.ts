import type { ChatMessage, QuickAction } from "./types";
import { CHAT_BRAND } from "./brand";

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: CHAT_BRAND.welcomeText,
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "setup-first-product", label: "Set up my first product" },
  { id: "what-can-score-do", label: "What can S.C.O.R.E. do?" },
  { id: "practice-sale", label: "Practice recording a sale" },
  { id: "ask-a-question", label: "Ask a question" },
];
