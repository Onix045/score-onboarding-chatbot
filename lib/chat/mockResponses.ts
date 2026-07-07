const UNCONFIRMED_FEATURE_KEYWORDS = [
  "price",
  "pricing",
  "cost",
  "payment",
  "tax",
  "refund",
  "hardware",
  "barcode",
  "scanner",
  "integrat",
  "offline",
  "multi-location",
  "certif",
];

export const UNCONFIRMED_FEATURE_FALLBACK =
  "I don't have confirmed information about that feature yet. A S.C.O.R.E. team member would be the best person to confirm it.";

/**
 * Deterministic mock reply used before the real RAG/Claude pipeline exists.
 * This is the seam that gets replaced by a real answer-generation call later.
 */
export function getMockReplyText(userText: string): string {
  const normalized = userText.trim().toLowerCase();

  if (UNCONFIRMED_FEATURE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return UNCONFIRMED_FEATURE_FALLBACK;
  }

  if (normalized.includes("set up") || normalized.includes("setup") || normalized.includes("first product")) {
    return "Great start! In the real setup flow you'd add a product name, a starting quantity, and a price. This demo doesn't save anything yet.";
  }

  if (
    normalized.includes("what can score do") ||
    normalized.includes("what does score do") ||
    normalized.includes("s.c.o.r.e. do")
  ) {
    return "S.C.O.R.E. helps you track inventory, record sales at the counter, keep basic customer information, and see simple reports about your business, all in one place.";
  }

  if (normalized.includes("practice") && normalized.includes("sale")) {
    return "Recording a sale normally takes a few taps: pick a product, confirm the quantity, and complete the sale. This demo doesn't record a real sale yet.";
  }

  if (normalized.includes("hard") && (normalized.includes("learn") || normalized.includes("use"))) {
    return "S.C.O.R.E. is built to feel simple, even if you've never used business software before. Most people learn the basics in just a few minutes.";
  }

  if (normalized.includes("inventory")) {
    return "Inventory tracking keeps a running count of what you have on hand, so you know when it's time to restock.";
  }

  return "Thanks for asking! This demo can share a sample answer about S.C.O.R.E.'s core features: inventory, sales, customers, and reporting. Try one of the quick actions above, or ask about any of those.";
}
