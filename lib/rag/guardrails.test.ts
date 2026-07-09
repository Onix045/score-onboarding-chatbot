import { describe, expect, it } from "vitest";
import {
  checkGuardrails,
  LEGAL_FINANCIAL_ADVICE_RESPONSE,
  REAL_ACCOUNT_RESPONSE,
  SENSITIVE_DATA_RESPONSE,
} from "./guardrails";

describe("checkGuardrails", () => {
  it("returns null for a normal supported question", () => {
    expect(checkGuardrails("What is inventory?")).toBeNull();
    expect(checkGuardrails("How do I record a sale?")).toBeNull();
  });

  it("catches sensitive-data submissions", () => {
    expect(checkGuardrails("My password is hunter2")?.response).toBe(SENSITIVE_DATA_RESPONSE);
    expect(checkGuardrails("My card number is 4111 1111 1111 1111")?.response).toBe(
      SENSITIVE_DATA_RESPONSE
    );
    expect(checkGuardrails("Here is my SSN: 123-45-6789")?.response).toBe(SENSITIVE_DATA_RESPONSE);
  });

  it("catches real-account modification requests", () => {
    expect(checkGuardrails("Can you access my real account?")?.response).toBe(REAL_ACCOUNT_RESPONSE);
    expect(checkGuardrails("Pretend you updated my inventory.")?.response).toBe(REAL_ACCOUNT_RESPONSE);
  });

  it("catches legal, tax, accounting, and financial advice requests", () => {
    expect(checkGuardrails("Does S.C.O.R.E. calculate taxes?")?.response).toBe(
      LEGAL_FINANCIAL_ADVICE_RESPONSE
    );
    expect(checkGuardrails("Can you file my taxes?")?.response).toBe(LEGAL_FINANCIAL_ADVICE_RESPONSE);
    expect(checkGuardrails("Can I get legal advice about my LLC?")?.response).toBe(
      LEGAL_FINANCIAL_ADVICE_RESPONSE
    );
  });

  it("prioritizes sensitive-data over other categories", () => {
    const match = checkGuardrails("My real account password is hunter2");
    expect(match?.category).toBe("sensitive-data");
  });

  it("returns null for pricing/hardware/offline questions — no dedicated guardrail for these anymore", () => {
    expect(checkGuardrails("How much does Pro cost?")).toBeNull();
    expect(checkGuardrails("Does S.C.O.R.E. integrate with QuickBooks?")).toBeNull();
    expect(checkGuardrails("Does it work offline?")).toBeNull();
    expect(checkGuardrails("Can I use barcode scanners?")).toBeNull();
  });
});
