import { describe, expect, it } from "vitest";
import { normalizeForEmbedding } from "./normalizeForEmbedding";

describe("normalizeForEmbedding", () => {
  it("collapses the dotted acronym to a plain undotted form", () => {
    expect(normalizeForEmbedding("What is S.C.O.R.E.?")).toBe("What is SCORE?");
  });

  it("matches case-insensitively and without a trailing period", () => {
    expect(normalizeForEmbedding("s.c.o.r.e is great")).toBe("SCORE is great");
  });

  it("leaves already-plain text untouched", () => {
    expect(normalizeForEmbedding("what is score?")).toBe("what is score?");
    expect(normalizeForEmbedding("How do I record a sale?")).toBe("How do I record a sale?");
  });

  it("normalizes every occurrence in longer content", () => {
    const input = "S.C.O.R.E. helps small businesses. Learn more about S.C.O.R.E. today.";
    expect(normalizeForEmbedding(input)).toBe("SCORE helps small businesses. Learn more about SCORE today.");
  });
});
