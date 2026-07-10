import { describe, expect, it } from "vitest";
import {
  ACKNOWLEDGEMENT_RESPONSE,
  checkGreeting,
  GREETING_RESPONSE,
  THANKS_RESPONSE,
  WELLBEING_RESPONSE,
} from "./greeting";

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

  it("responds naturally to bare wellbeing small talk", () => {
    expect(checkGreeting("How are you doing today?")).toBe(WELLBEING_RESPONSE);
    expect(checkGreeting("What's up?")).toBe(WELLBEING_RESPONSE);
  });

  it("responds naturally to bare thanks", () => {
    expect(checkGreeting("Thank you!")).toBe(THANKS_RESPONSE);
    expect(checkGreeting("Appreciate it.")).toBe(THANKS_RESPONSE);
  });

  it("responds naturally to bare acknowledgements", () => {
    expect(checkGreeting("good.")).toBe(ACKNOWLEDGEMENT_RESPONSE);
    expect(checkGreeting("Got it")).toBe(ACKNOWLEDGEMENT_RESPONSE);
  });

  it("does not swallow product questions that include small talk", () => {
    expect(checkGreeting("How are you, and what is inventory tracking?")).toBeNull();
    expect(checkGreeting("Thanks, how do I record a sale?")).toBeNull();
    expect(checkGreeting("Good, how do I record a sale?")).toBeNull();
  });
});
