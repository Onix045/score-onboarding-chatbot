import { describe, expect, it } from "vitest";
import {
  OnboardingValidationError,
  validatePrice,
  validateProductName,
  validateSaleQuantity,
  validateStartingQuantity,
} from "./validate";

describe("validateProductName", () => {
  it("trims and returns a valid name", () => {
    expect(validateProductName("  Blue Mug  ")).toBe("Blue Mug");
  });

  it("rejects empty or whitespace-only names", () => {
    expect(() => validateProductName("")).toThrow(OnboardingValidationError);
    expect(() => validateProductName("   ")).toThrow(OnboardingValidationError);
  });

  it("rejects names over the length limit", () => {
    expect(() => validateProductName("a".repeat(81))).toThrow(OnboardingValidationError);
  });
});

describe("validateStartingQuantity", () => {
  it("returns a positive whole number", () => {
    expect(validateStartingQuantity("12")).toBe(12);
  });

  it("rejects zero, negative, non-integer, or non-numeric input", () => {
    expect(() => validateStartingQuantity("0")).toThrow(OnboardingValidationError);
    expect(() => validateStartingQuantity("-3")).toThrow(OnboardingValidationError);
    expect(() => validateStartingQuantity("2.5")).toThrow(OnboardingValidationError);
    expect(() => validateStartingQuantity("abc")).toThrow(OnboardingValidationError);
    expect(() => validateStartingQuantity("")).toThrow(OnboardingValidationError);
  });
});

describe("validatePrice", () => {
  it("returns a rounded non-negative price", () => {
    expect(validatePrice("4.999")).toBe(5);
    expect(validatePrice("0")).toBe(0);
  });

  it("rejects negative or non-numeric input", () => {
    expect(() => validatePrice("-1")).toThrow(OnboardingValidationError);
    expect(() => validatePrice("abc")).toThrow(OnboardingValidationError);
    expect(() => validatePrice("")).toThrow(OnboardingValidationError);
  });
});

describe("validateSaleQuantity", () => {
  it("returns a positive whole number at or under the available stock", () => {
    expect(validateSaleQuantity("3", 12)).toBe(3);
    expect(validateSaleQuantity("12", 12)).toBe(12);
  });

  it("rejects a quantity over the available stock", () => {
    expect(() => validateSaleQuantity("13", 12)).toThrow(OnboardingValidationError);
  });

  it("rejects zero, negative, non-integer, or non-numeric input", () => {
    expect(() => validateSaleQuantity("0", 12)).toThrow(OnboardingValidationError);
    expect(() => validateSaleQuantity("-1", 12)).toThrow(OnboardingValidationError);
    expect(() => validateSaleQuantity("1.5", 12)).toThrow(OnboardingValidationError);
    expect(() => validateSaleQuantity("abc", 12)).toThrow(OnboardingValidationError);
  });
});
