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
]);

export const ACKNOWLEDGEMENT_RESPONSE =
  "Great. If you want to keep going, you can ask another question or try one of the setup practice options.";

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
  return null;
}
