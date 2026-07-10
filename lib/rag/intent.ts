export type ConversationIntent = "conversation_control" | "product_question";

export const CONVERSATION_CONTROL_RESPONSE =
  "Got it — I won't repeat the same explanation. Tell me what you'd like next: a shorter version, a simpler example, or the next step.";

const CONVERSATION_CONTROL_PATTERNS = [
  /\bdon'?t repeat\b/,
  /\bstop repeating\b/,
  /\byou already (said|told|explained)\b/,
  /\bi already (know|understand|got)\b/,
  /\bexplain (it|that|this)?\s*(again|differently|another way|simply|simpler)\b/,
  /\bsay (it|that|this)?\s*(differently|another way|simply|simpler)\b/,
  /\bmake (it|that|this)?\s*(shorter|simpler|clearer)\b/,
];

function normalizeIntentText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export function detectConversationIntent(message: string): ConversationIntent {
  const normalized = normalizeIntentText(message);
  return CONVERSATION_CONTROL_PATTERNS.some((pattern) => pattern.test(normalized))
    ? "conversation_control"
    : "product_question";
}
