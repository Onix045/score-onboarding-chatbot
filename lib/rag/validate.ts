const MAX_QUESTION_LENGTH = 1000;

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
