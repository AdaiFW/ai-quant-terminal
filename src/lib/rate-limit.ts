/* ═══════════════════════════════════════════
   Rate Limiter — Token Bucket (In-Memory)
   ───────────────────────────────────────────
   For production, replace with Vercel KV
   or Upstash Redis. This in-memory version
   is suitable for single-instance deployments.
   ═══════════════════════════════════════════ */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, Bucket>();

interface RateLimitConfig {
  /** Max tokens per window */
  maxTokens: number;
  /** Token refill rate per second */
  refillRate: number;
  /** Window duration in seconds (for key TTL cleanup) */
  windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 30,
  refillRate: 2, // 2 tokens/second
  windowSeconds: 60,
};

const AI_CONFIG: RateLimitConfig = {
  maxTokens: 10,
  refillRate: 0.2, // 1 token per 5 seconds
  windowSeconds: 120,
};

/**
 * Check if a request is rate limited.
 * Returns { allowed: boolean; remaining: number; reset: number }
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
): { allowed: boolean; remaining: number; reset: number } {
  const resolved = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket) {
    store.set(key, { tokens: resolved.maxTokens - 1, lastRefill: now });
    return {
      allowed: true,
      remaining: resolved.maxTokens - 1,
      reset: now + resolved.windowSeconds * 1000,
    };
  }

  // Refill tokens
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refill = Math.floor(elapsed * resolved.refillRate);
  bucket.tokens = Math.min(resolved.maxTokens, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return {
      allowed: true,
      remaining: bucket.tokens,
      reset: now + resolved.windowSeconds * 1000,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    reset: now + resolved.windowSeconds * 1000,
  };
}

/**
 * Rate limit for stock data API.
 */
export function stockAPILimit(identifier: string) {
  return checkRateLimit(`stock:${identifier}`, {
    maxTokens: 30,
    refillRate: 2,
    windowSeconds: 60,
  });
}

/**
 * Rate limit for AI analysis API (stricter — LLM calls are expensive).
 */
export function aiAPILimit(identifier: string) {
  return checkRateLimit(`ai:${identifier}`, AI_CONFIG);
}

/**
 * Periodic cleanup of stale buckets.
 */
let lastCleanup = Date.now();
function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, bucket] of store.entries()) {
    if (now - bucket.lastRefill > 600_000) store.delete(key);
  }
}

// Run cleanup before each check
export function withCleanup<T>(fn: () => T): T {
  cleanup();
  return fn();
}
