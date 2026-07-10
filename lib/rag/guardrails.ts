export type GuardrailCategory = "sensitive-data" | "real-account" | "legal-financial-advice";

export interface GuardrailMatch {
  category: GuardrailCategory;
  response: string;
}

export const SENSITIVE_DATA_RESPONSE =
  "Please don't share passwords, card information, banking details, or identification numbers here.";

export const REAL_ACCOUNT_RESPONSE =
  "This demonstration cannot access or change a real S.C.O.R.E. account. I can explain how the process would work.";

export const LEGAL_FINANCIAL_ADVICE_RESPONSE =
  "I can explain how S.C.O.R.E. organizes business information, but I can't provide legal, tax, accounting, or financial advice.";

const SENSITIVE_DATA_KEYWORDS = [
  "password",
  "cvv",
  "ssn",
  "social security",
  "routing number",
  "bank account",
  "account number",
  "passport number",
  "driver's license",
  "driver license",
  "national id",
];

const REAL_ACCOUNT_KEYWORDS = [
  "real account",
  "my account",
  "actual account",
  "save this for real",
  "actually save",
  "actually update",
  "really save",
  "really update",
  "pretend you updated",
  "pretend you saved",
  "act as if you updated",
  "act as if you saved",
];

const LEGAL_FINANCIAL_KEYWORDS = [
  "tax",
  "legal advice",
  "accounting",
  "accountant",
  "investment advice",
  "financial advice",
  "lawsuit",
  "audit",
];

function matchesAny(normalized: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalized.includes(keyword));
}

/** Digit runs of 13-19 digits (ignoring spaces/dashes) look like a payment
 * card number — a deliberately simple heuristic, not PCI-grade detection. */
function containsCardLikeNumber(rawText: string): boolean {
  const digitRuns = rawText.match(/\d[\d\s-]{11,}\d/g) ?? [];
  return digitRuns.some((run) => {
    const digitsOnly = run.replace(/\D/g, "");
    return digitsOnly.length >= 13 && digitsOnly.length <= 19;
  });
}

/**
 * Three independent deterministic pre-checks run before vector-store retrieve/
 * generate — a deterministic guarantee, not a prompt instruction, so it
 * can't be defeated by a cleverly worded question. Order reflects
 * priority when a question could plausibly match more than one category.
 */
export function checkGuardrails(question: string): GuardrailMatch | null {
  const normalized = question.toLowerCase();

  if (containsCardLikeNumber(question) || matchesAny(normalized, SENSITIVE_DATA_KEYWORDS)) {
    return { category: "sensitive-data", response: SENSITIVE_DATA_RESPONSE };
  }

  if (matchesAny(normalized, REAL_ACCOUNT_KEYWORDS)) {
    return { category: "real-account", response: REAL_ACCOUNT_RESPONSE };
  }

  if (matchesAny(normalized, LEGAL_FINANCIAL_KEYWORDS)) {
    return { category: "legal-financial-advice", response: LEGAL_FINANCIAL_ADVICE_RESPONSE };
  }

  return null;
}
