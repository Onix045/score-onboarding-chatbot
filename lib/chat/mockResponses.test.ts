import { describe, expect, it } from "vitest";
import { getMockReplyText, UNCONFIRMED_FEATURE_FALLBACK } from "./mockResponses";

describe("getMockReplyText", () => {
  it("returns the confirmed fallback sentence for unconfirmed feature topics", () => {
    expect(getMockReplyText("How much does it cost?")).toBe(UNCONFIRMED_FEATURE_FALLBACK);
    expect(getMockReplyText("Does it support tax calculation?")).toBe(UNCONFIRMED_FEATURE_FALLBACK);
  });

  it("explains core features when asked what S.C.O.R.E. can do", () => {
    expect(getMockReplyText("What can S.C.O.R.E. do?")).toMatch(/inventory/i);
  });

  it("responds to a practice-sale request", () => {
    expect(getMockReplyText("Practice recording a sale")).toMatch(/sale/i);
  });

  it("returns a generic demo response for unmatched input", () => {
    expect(getMockReplyText("blah blah blah")).toMatch(/demo/i);
  });
});
