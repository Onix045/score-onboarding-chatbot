import { describe, expect, it } from "vitest";
import { QuestionValidationError, validateQuestion } from "./validate";

describe("validateQuestion", () => {
  it("returns the trimmed question when valid", () => {
    expect(validateQuestion("  What is inventory?  ")).toBe("What is inventory?");
  });

  it("rejects an empty string", () => {
    expect(() => validateQuestion("")).toThrow(QuestionValidationError);
  });

  it("rejects whitespace-only input", () => {
    expect(() => validateQuestion("   \n\t  ")).toThrow(QuestionValidationError);
  });

  it("rejects a question over the length limit", () => {
    expect(() => validateQuestion("a".repeat(1001))).toThrow(QuestionValidationError);
  });

  it("accepts a question exactly at the length limit", () => {
    expect(() => validateQuestion("a".repeat(1000))).not.toThrow();
  });
});
