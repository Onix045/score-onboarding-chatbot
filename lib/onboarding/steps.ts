import type { OnboardingState, OnboardingStepId } from "./types";

// "complete" is a final screen, not a numbered step shown to the user —
// totalSteps() below reflects only the steps the user actively fills in.
const STEP_ORDER: OnboardingStepId[] = ["add-product", "record-sale", "complete"];

export function stepNumber(step: OnboardingStepId): number {
  return STEP_ORDER.indexOf(step) + 1;
}

export function totalSteps(): number {
  return STEP_ORDER.length - 1;
}

export function nextStep(step: OnboardingStepId): OnboardingStepId {
  const index = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)];
}

export function previousStep(step: OnboardingStepId): OnboardingStepId {
  const index = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.max(index - 1, 0)];
}

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  step: "add-product",
  product: { name: "", quantity: "", price: "" },
  sale: { quantity: "" },
  confirmedProduct: null,
  soldQuantity: null,
  error: null,
};
