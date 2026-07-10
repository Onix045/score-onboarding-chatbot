export interface RetryOptions {
  retries: number;
  delayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = { retries: 2, delayMs: 500 };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a transient OpenAI call a small, fixed
 * number of times before giving up — this environment has been observed
 * to hit intermittent TLS/connection resets and timeouts that the
 * underlying SDK's own retry logic doesn't fully absorb, and a single
 * flaky call shouldn't be the difference between a real answer and the
 * fixed fallback. Never retries indefinitely and never swallows the final
 * error — callers still see (and log/degrade on) a rejected promise if
 * every attempt fails.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = DEFAULT_OPTIONS): Promise<T> {
  const { retries, delayMs } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await wait(delayMs);
      }
    }
  }

  throw lastError;
}
