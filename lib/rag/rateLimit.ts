interface Bucket {
  count: number;
  resetAt: number;
}

// Module-scope singleton. Resets on server restart/redeploy — an accepted
// limitation for a single-instance prototype, not production-grade rate
// limiting (no Redis/Upstash dependency, per CLAUDE.md's "no heavy infra").
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/** Basic in-memory per-identifier (e.g. IP) token bucket. */
export function checkRateLimit(
  identifier: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now()
): RateLimitResult {
  const existing = buckets.get(identifier);

  if (!existing || now >= existing.resetAt) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

/** Test-only: clears all buckets so tests don't leak state across cases. */
export function resetRateLimitStateForTests(): void {
  buckets.clear();
}
