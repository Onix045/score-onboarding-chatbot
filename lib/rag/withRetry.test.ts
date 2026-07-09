import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./withRetry";

describe("withRetry", () => {
  it("returns the result on the first successful attempt without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { retries: 1, delayMs: 0 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once after a failure and returns the result of the successful retry", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("transient")).mockResolvedValueOnce("recovered");

    const result = await withRetry(fn, { retries: 1, delayMs: 0 });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error once every attempt has failed", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent failure"));

    await expect(withRetry(fn, { retries: 1, delayMs: 0 })).rejects.toThrow("persistent failure");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("makes exactly retries + 1 attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("down"));

    await expect(withRetry(fn, { retries: 3, delayMs: 0 })).rejects.toThrow("down");
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("never retries when retries is 0", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("down"));

    await expect(withRetry(fn, { retries: 0, delayMs: 0 })).rejects.toThrow("down");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
