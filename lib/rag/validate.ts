import type { ChatHistoryTurn } from "./types";

export const MAX_QUESTION_LENGTH = 1000;
export const MAX_HISTORY_TURNS = 24;

export class QuestionValidationError extends Error {}

/** Rejects empty, whitespace-only, or excessively long input before any
 * network call. Pure, unit-tested. */
export function validateQuestion(question: string): string {
  const trimmed = question.trim();

  if (!trimmed) {
    throw new QuestionValidationError("Question must not be empty.");
  }

  if (trimmed.length > MAX_QUESTION_LENGTH) {
    throw new QuestionValidationError(`Question must be ${MAX_QUESTION_LENGTH} characters or fewer.`);
  }

  return trimmed;
}

function isHistoryRole(value: unknown): value is ChatHistoryTurn["role"] {
  return value === "user" || value === "assistant";
}

/**
 * Accepts the raw, untrusted `history` field from the request body.
 * `undefined` (a client that predates history support, or the first turn
 * of a conversation) normalizes to `[]`. Every other shape is rejected the
 * same way `validateQuestion` rejects a bad question — a 400 in route.ts,
 * before any network call — so a malformed request never silently loses
 * its history.
 */
export function validateHistory(history: unknown): ChatHistoryTurn[] {
  if (history === undefined) return [];

  if (!Array.isArray(history)) {
    throw new QuestionValidationError('"history" must be an array.');
  }

  if (history.length > MAX_HISTORY_TURNS) {
    throw new QuestionValidationError(`"history" must contain ${MAX_HISTORY_TURNS} turns or fewer.`);
  }

  return history.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new QuestionValidationError(`"history[${index}]" must be an object.`);
    }

    const { role, text } = entry as { role?: unknown; text?: unknown };

    if (!isHistoryRole(role)) {
      throw new QuestionValidationError(`"history[${index}].role" must be "user" or "assistant".`);
    }

    if (typeof text !== "string") {
      throw new QuestionValidationError(`"history[${index}].text" must be a string.`);
    }

    const trimmed = text.trim();

    if (!trimmed) {
      throw new QuestionValidationError(`"history[${index}].text" must not be empty.`);
    }

    if (trimmed.length > MAX_QUESTION_LENGTH) {
      throw new QuestionValidationError(
        `"history[${index}].text" must be ${MAX_QUESTION_LENGTH} characters or fewer.`
      );
    }

    return { role, text: trimmed };
  });
}
