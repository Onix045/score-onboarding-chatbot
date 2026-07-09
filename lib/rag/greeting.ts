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
  return GREETING_PHRASES.has(normalizeForGreetingMatch(question)) ? GREETING_RESPONSE : null;
}
