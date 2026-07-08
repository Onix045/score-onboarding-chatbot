import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitStateForTests } from "./rateLimit";

const OPTIONS = { limit: 3, windowMs: 60_000 };

beforeEach(() => {
  resetRateLimitStateForTests();
});

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    expect(checkRateLimit("1.2.3.4", OPTIONS, 0).allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4", OPTIONS, 1).allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4", OPTIONS, 2).allowed).toBe(true);
  });

  it("rejects once the limit is exceeded within the window", () => {
    checkRateLimit("1.2.3.4", OPTIONS, 0);
    checkRateLimit("1.2.3.4", OPTIONS, 1);
    checkRateLimit("1.2.3.4", OPTIONS, 2);
    const result = checkRateLimit("1.2.3.4", OPTIONS, 3);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window elapses", () => {
    checkRateLimit("1.2.3.4", OPTIONS, 0);
    checkRateLimit("1.2.3.4", OPTIONS, 1);
    checkRateLimit("1.2.3.4", OPTIONS, 2);
    expect(checkRateLimit("1.2.3.4", OPTIONS, 3).allowed).toBe(false);

    const afterWindow = checkRateLimit("1.2.3.4", OPTIONS, 60_001);
    expect(afterWindow.allowed).toBe(true);
  });

  it("tracks different identifiers independently", () => {
    checkRateLimit("1.2.3.4", OPTIONS, 0);
    checkRateLimit("1.2.3.4", OPTIONS, 1);
    checkRateLimit("1.2.3.4", OPTIONS, 2);
    expect(checkRateLimit("1.2.3.4", OPTIONS, 3).allowed).toBe(false);

    expect(checkRateLimit("5.6.7.8", OPTIONS, 3).allowed).toBe(true);
  });
});
