export const RURAL_TECHNOLOGIES_EMAIL = "contact@ruraltechnologies.co";
export const RURAL_TECHNOLOGIES_WEBSITE = "https://www.ruraltechnologies.co/";

export const RURAL_CONTACT_RESPONSE = `You can contact Rural Technologies at ${RURAL_TECHNOLOGIES_EMAIL}. You can also visit ${RURAL_TECHNOLOGIES_WEBSITE}.`;

const CONTACT_INTENT_PATTERNS = [
  /\bcontact\b/,
  /\bemail\b/,
  /\breach\b/,
  /\bget in touch\b/,
  /\bsupport\b/,
  /\bmore detail\b/,
  /\bdetails\b/,
];

function normalizeContactText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export function checkRuralContact(question: string): string | null {
  const normalized = normalizeContactText(question);
  const mentionsRural =
    normalized.includes("rural") ||
    normalized.includes("rural technologies") ||
    normalized.includes("ruraltechnologies");

  if (!mentionsRural) return null;

  const asksForContact = CONTACT_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
  return asksForContact ? RURAL_CONTACT_RESPONSE : null;
}
