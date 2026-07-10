export type OnboardingStepId = "add-product" | "record-sale" | "complete";

export interface ProductDraft {
  name: string;
  quantity: string;
  price: string;
}

export interface SaleDraft {
  quantity: string;
}

export interface ProductSummary {
  name: string;
  quantity: number;
  price: number;
}

export interface OnboardingState {
  step: OnboardingStepId;
  product: ProductDraft;
  sale: SaleDraft;
  confirmedProduct: ProductSummary | null;
  soldQuantity: number | null;
  error: string | null;
}
