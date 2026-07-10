"use client";

import { useCallback, useState } from "react";
import { INITIAL_ONBOARDING_STATE, nextStep, previousStep } from "@/lib/onboarding/steps";
import type { OnboardingState } from "@/lib/onboarding/types";
import {
  OnboardingValidationError,
  validatePrice,
  validateProductName,
  validateSaleQuantity,
  validateStartingQuantity,
} from "@/lib/onboarding/validate";

/**
 * Deterministic state machine for the practice setup flow — no LLM call
 * anywhere in this file. Step progression, field validation, and the
 * remaining-stock calculation are pure TypeScript per CLAUDE.md §4.
 */
export function useOnboardingController() {
  const [active, setActive] = useState(false);
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE);

  const start = useCallback(() => {
    setState(INITIAL_ONBOARDING_STATE);
    setActive(true);
  }, []);

  const exit = useCallback(() => {
    setActive(false);
  }, []);

  const restart = useCallback(() => {
    setState(INITIAL_ONBOARDING_STATE);
  }, []);

  const updateProductField = useCallback((field: keyof OnboardingState["product"], value: string) => {
    setState((prev) => ({ ...prev, product: { ...prev.product, [field]: value }, error: null }));
  }, []);

  const updateSaleQuantity = useCallback((value: string) => {
    setState((prev) => ({ ...prev, sale: { quantity: value }, error: null }));
  }, []);

  const submitProduct = useCallback(() => {
    setState((prev) => {
      try {
        const name = validateProductName(prev.product.name);
        const quantity = validateStartingQuantity(prev.product.quantity);
        const price = validatePrice(prev.product.price);
        return {
          ...prev,
          step: nextStep(prev.step),
          confirmedProduct: { name, quantity, price },
          error: null,
        };
      } catch (error) {
        if (error instanceof OnboardingValidationError) {
          return { ...prev, error: error.message };
        }
        throw error;
      }
    });
  }, []);

  const submitSale = useCallback(() => {
    setState((prev) => {
      if (!prev.confirmedProduct) return prev;
      try {
        const quantity = validateSaleQuantity(prev.sale.quantity, prev.confirmedProduct.quantity);
        return {
          ...prev,
          step: nextStep(prev.step),
          soldQuantity: quantity,
          confirmedProduct: {
            ...prev.confirmedProduct,
            quantity: prev.confirmedProduct.quantity - quantity,
          },
          error: null,
        };
      } catch (error) {
        if (error instanceof OnboardingValidationError) {
          return { ...prev, error: error.message };
        }
        throw error;
      }
    });
  }, []);

  const back = useCallback(() => {
    setState((prev) => ({ ...prev, step: previousStep(prev.step), error: null }));
  }, []);

  return {
    active,
    state,
    start,
    exit,
    restart,
    updateProductField,
    updateSaleQuantity,
    submitProduct,
    submitSale,
    back,
  };
}
