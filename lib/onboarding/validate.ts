export const MAX_PRODUCT_NAME_LENGTH = 80;

export class OnboardingValidationError extends Error {}

/** Rejects empty, whitespace-only, or excessively long product names. */
export function validateProductName(rawName: string): string {
  const trimmed = rawName.trim();

  if (!trimmed) {
    throw new OnboardingValidationError("Enter a product name to continue.");
  }

  if (trimmed.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new OnboardingValidationError(`Product name must be ${MAX_PRODUCT_NAME_LENGTH} characters or fewer.`);
  }

  return trimmed;
}

/** A starting stock count: a positive whole number. */
export function validateStartingQuantity(rawQuantity: string): number {
  const trimmed = rawQuantity.trim();
  const value = Number(trimmed);

  if (!trimmed || !Number.isInteger(value) || value <= 0) {
    throw new OnboardingValidationError("Enter a whole number greater than 0.");
  }

  return value;
}

/** A price in whatever currency the business uses: zero or a positive amount. */
export function validatePrice(rawPrice: string): number {
  const trimmed = rawPrice.trim();
  const value = Number(trimmed);

  if (!trimmed || !Number.isFinite(value) || value < 0) {
    throw new OnboardingValidationError("Enter a price of 0 or more.");
  }

  return Math.round(value * 100) / 100;
}

/**
 * A sale quantity: a positive whole number that can't exceed what's in
 * stock — the same deterministic inventory-math guarantee a real POS
 * would enforce, kept in TypeScript rather than left to the LLM.
 */
export function validateSaleQuantity(rawQuantity: string, availableQuantity: number): number {
  const trimmed = rawQuantity.trim();
  const value = Number(trimmed);

  if (!trimmed || !Number.isInteger(value) || value <= 0) {
    throw new OnboardingValidationError("Enter a whole number greater than 0.");
  }

  if (value > availableQuantity) {
    throw new OnboardingValidationError(
      `You only added ${availableQuantity} in stock — enter ${availableQuantity} or fewer.`
    );
  }

  return value;
}
