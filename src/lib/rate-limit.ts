// Lightweight rate limiter for API routes.
//
// Backing store: in-memory Map per serverless instance. On Vercel this
// means the limit is enforced *per warm container*, not globally — a
// cold start on a new instance gets fresh counters and a distributed
// attacker hitting multiple instances can amplify their effective rate.
//
// This is still meaningful mitigation for the common abuse vector
// (single attacker enumerating a list endpoint from one IP) and is
// zero-config. For stricter guarantees, swap `memoryStore` below for
// an Upstash Redis or Supabase-backed store that shares state across
// instances.

type Bucket = { count: number; resetAt: number };

export interface RateLimitStore {
  get(key: string): Bucket | undefined;
  set(key: string, bucket: Bucket): void;
}

const memoryStore: RateLimitStore = (() => {
  const map = new Map<string, Bucket>();
  return {
    get: (k) => map.get(k),
    set: (k, v) => {
      map.set(k, v);
      // Bounded cleanup: if the map grows past a soft cap, drop expired
      // entries. Prevents unbounded growth on adversarial key churn.
      if (map.size > 10_000) {
        const now = Date.now();
        for (const [key, b] of map) {
          if (b.resetAt <= now) map.delete(key);
        }
      }
    },
  };
})();

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterSec: number; resetAt: number };

/**
 * Fixed-window rate limit check. Increments the counter for `key` and
 * returns whether the caller is allowed to proceed.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  store: RateLimitStore = memoryStore,
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    store.set(key, bucket);
    return { allowed: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }
  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    };
  }
  existing.count += 1;
  store.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Derives a stable rate-limit key from an authenticated user ID or the
 * request's best-effort IP. The `scope` is a route prefix so different
 * endpoints don't share buckets.
 */
export function rateLimitKey(
  scope: string,
  request: Request,
  userId?: string,
): string {
  if (userId) return `${scope}:user:${userId}`;
  const fwd = request.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `${scope}:ip:${ip}`;
}
