import { describe, expect, it } from "vitest";
import { checkGreeting, GREETING_RESPONSE } from "./greeting";

describe("checkGreeting", () => {
  it("matches bare greetings, case- and punctuation-insensitively", () => {
    expect(checkGreeting("Hello")).toBe(GREETING_RESPONSE);
    expect(checkGreeting("hi!")).toBe(GREETING_RESPONSE);
    expect(checkGreeting("  Hey  ")).toBe(GREETING_RESPONSE);
    expect(checkGreeting("Good morning")).toBe(GREETING_RESPONSE);
  });

  it("does not match a real question, even one that mentions a greeting word", () => {
    expect(checkGreeting("What is S.C.O.R.E.?")).toBeNull();
    expect(checkGreeting("Hi, does it work offline?")).toBeNull();
  });
});
