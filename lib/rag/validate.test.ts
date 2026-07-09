import { describe, expect, it } from "vitest";
import { MAX_HISTORY_TURNS, QuestionValidationError, validateHistory, validateQuestion } from "./validate";

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

describe("validateHistory", () => {
  it("returns [] for undefined history", () => {
    expect(validateHistory(undefined)).toEqual([]);
  });

  it("normalizes and trims valid history turns", () => {
    expect(validateHistory([{ role: "user", text: "  hi  " }])).toEqual([{ role: "user", text: "hi" }]);
  });

  it("rejects non-array history", () => {
    expect(() => validateHistory("nope")).toThrow(QuestionValidationError);
  });

  it("rejects history over MAX_HISTORY_TURNS", () => {
    const history = Array.from({ length: MAX_HISTORY_TURNS + 1 }, () => ({ role: "user", text: "hi" }));
    expect(() => validateHistory(history)).toThrow(QuestionValidationError);
  });

  it("accepts history exactly at MAX_HISTORY_TURNS", () => {
    const history = Array.from({ length: MAX_HISTORY_TURNS }, () => ({ role: "user", text: "hi" }));
    expect(() => validateHistory(history)).not.toThrow();
  });

  it("rejects a turn with an invalid role", () => {
    expect(() => validateHistory([{ role: "system", text: "x" }])).toThrow(QuestionValidationError);
  });

  it("rejects a turn with non-string text", () => {
    expect(() => validateHistory([{ role: "user", text: 42 }])).toThrow(QuestionValidationError);
  });

  it("rejects a turn with empty/whitespace-only text", () => {
    expect(() => validateHistory([{ role: "user", text: "   " }])).toThrow(QuestionValidationError);
  });

  it("rejects a turn with text over the length limit", () => {
    expect(() => validateHistory([{ role: "user", text: "a".repeat(1001) }])).toThrow(QuestionValidationError);
  });

  it("rejects a non-object entry", () => {
    expect(() => validateHistory([null])).toThrow(QuestionValidationError);
    expect(() => validateHistory(["x"])).toThrow(QuestionValidationError);
  });
});
