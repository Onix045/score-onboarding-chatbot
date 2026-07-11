const GREETING_PHRASES = new Set([
  "hi",
  "hello",
  "hey",
  "hiya",
  "yo",
  "howdy",
  "greetings",
  "good morning",
  "good afternoon",
  "good evening",
]);

export const GREETING_RESPONSE =
  "Hello! I'm the S.C.O.R.E. Guide. Ask me anything about S.C.O.R.E., or try one of the suggestions below to get started.";

const WELLBEING_PHRASES = new Set([
  "how are you",
  "how are you doing",
  "how are you doing today",
  "how are you today",
  "how is it going",
  "hows it going",
  "how are things",
  "whats up",
  "sup",
]);

export const WELLBEING_RESPONSE =
  "I'm doing well, thanks for asking! I'm here and ready to help you get comfortable with S.C.O.R.E. What would you like to work on today?";

const THANKS_PHRASES = new Set(["thanks", "thank you", "thank you so much", "thanks a lot", "appreciate it"]);

export const THANKS_RESPONSE =
  "You're welcome! I'm happy to help. If you want, we can keep going with setup, inventory, sales, customers, or reports.";

const ACKNOWLEDGEMENT_PHRASES = new Set([
  "good",
  "great",
  "nice",
  "cool",
  "ok",
  "okay",
  "alright",
  "sounds good",
  "got it",
  "i see",
  "understood",
  "wonderful",
]);

export const ACKNOWLEDGEMENT_RESPONSE =
  "Great. If you want to keep going, you can ask another question or try one of the setup practice options.";

const FAREWELL_PHRASES = new Set([
  "bye",
  "bye bot",
  "goodbye",
  "good bye",
  "see you",
  "see you later",
  "talk to you later",
  "thats all",
  "that is all",
]);

export const FAREWELL_RESPONSE =
  "Goodbye! I'm here whenever you want help with S.C.O.R.E. again.";

const LIGHT_CHAT_PHRASES = new Set([
  "haha",
  "ha ha",
  "lol",
  "lmao",
  "jk",
  "just kidding",
  "kidding",
  "only joking",
  "i am joking",
  "this is system words",
  "system words",
  "bot",
  "chatbot",
]);

const PRODUCT_CONTEXT_WORDS = [
  "score",
  "inventory",
  "sale",
  "sales",
  "customer",
  "crm",
  "report",
  "reports",
  "setup",
  "start",
  "product",
  "price",
  "pricing",
  "payment",
  "account",
  "rural",
  "contact",
  "email",
];

export const LIGHT_CHAT_RESPONSE =
  "No worries. You can ask me about setup, inventory, sales, customers, reports, or anything else you want to understand about S.C.O.R.E.";

function normalizeForGreetingMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Matches only when the entire message is a bare greeting — a whole-string
 * match, never a substring match, so "hi, does it work offline?" still
 * reaches the guardrails/retrieval pipeline instead of being swallowed
 * here as small talk.
 */
export function checkGreeting(question: string): string | null {
  const normalized = normalizeForGreetingMatch(question);
  if (GREETING_PHRASES.has(normalized)) return GREETING_RESPONSE;
  if (WELLBEING_PHRASES.has(normalized)) return WELLBEING_RESPONSE;
  if (THANKS_PHRASES.has(normalized)) return THANKS_RESPONSE;
  if (ACKNOWLEDGEMENT_PHRASES.has(normalized)) return ACKNOWLEDGEMENT_RESPONSE;
  if (FAREWELL_PHRASES.has(normalized)) return FAREWELL_RESPONSE;
  if (LIGHT_CHAT_PHRASES.has(normalized)) return LIGHT_CHAT_RESPONSE;
  if (
    normalized.length <= 40 &&
    /\b(haha|lol|lmao|jk|joking|kidding)\b/.test(normalized) &&
    !PRODUCT_CONTEXT_WORDS.some((word) => normalized.includes(word))
  ) {
    return LIGHT_CHAT_RESPONSE;
  }
  return null;
}
