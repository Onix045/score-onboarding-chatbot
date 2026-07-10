import { describe, expect, it } from "vitest";
import { INITIAL_ONBOARDING_STATE, nextStep, previousStep, stepNumber, totalSteps } from "./steps";

describe("stepNumber", () => {
  it("returns a 1-based position for each step", () => {
    expect(stepNumber("add-product")).toBe(1);
    expect(stepNumber("record-sale")).toBe(2);
    expect(stepNumber("complete")).toBe(3);
  });
});

describe("totalSteps", () => {
  it("counts only the steps the user actively fills in, not the completion screen", () => {
    expect(totalSteps()).toBe(2);
  });
});

describe("nextStep", () => {
  it("advances through the sequence and stops at the last step", () => {
    expect(nextStep("add-product")).toBe("record-sale");
    expect(nextStep("record-sale")).toBe("complete");
    expect(nextStep("complete")).toBe("complete");
  });
});

describe("previousStep", () => {
  it("goes back through the sequence and stops at the first step", () => {
    expect(previousStep("complete")).toBe("record-sale");
    expect(previousStep("record-sale")).toBe("add-product");
    expect(previousStep("add-product")).toBe("add-product");
  });
});

describe("INITIAL_ONBOARDING_STATE", () => {
  it("starts on the add-product step with empty drafts and no error", () => {
    expect(INITIAL_ONBOARDING_STATE.step).toBe("add-product");
    expect(INITIAL_ONBOARDING_STATE.product).toEqual({ name: "", quantity: "", price: "" });
    expect(INITIAL_ONBOARDING_STATE.sale).toEqual({ quantity: "" });
    expect(INITIAL_ONBOARDING_STATE.confirmedProduct).toBeNull();
    expect(INITIAL_ONBOARDING_STATE.error).toBeNull();
  });
});
