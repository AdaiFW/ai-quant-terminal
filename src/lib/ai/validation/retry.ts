/* ═══════════════════════════════════════════
   Retry Strategy Utilities
   ───────────────────────────────────────────
   Composable retry policies for AI generation.
   ═══════════════════════════════════════════ */

export interface RetryPolicy {
  maxAttempts: number;
  /** Base delay in ms — used by exponential & linear strategies */
  baseDelayMs: number;
  /** Maximum total delay across all retries */
  maxTotalDelayMs: number;
  strategy: "exponential" | "linear" | "fixed";
  /** Error classifier — return true to retry on this error */
  shouldRetry: (error: Error) => boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxTotalDelayMs: 15_000,
  strategy: "exponential",
  shouldRetry: isTransientError,
};

/**
 * Decide whether an error is transient (retryable).
 * Returns false for validation/schema errors — retrying
 * on a broken schema wastes tokens and time.
 */
export function isTransientError(error: Error): boolean {
  const msg = error.message.toLowerCase();

  // Never retry validation errors — the schema is the contract
  if (error.name === "ZodError") return false;
  if (msg.includes("type validation")) return false;
  if (msg.includes("schema")) return false;

  // Retry on network, timeout, rate-limit, server errors
  if (msg.includes("timeout") || msg.includes("etimedout")) return true;
  if (msg.includes("econnrefused") || msg.includes("enotfound")) return true;
  if (msg.includes("econnreset") || msg.includes("socket")) return true;
  if (msg.includes("429") || msg.includes("rate limit")) return true;
  if (msg.includes("500") || msg.includes("502")) return true;
  if (msg.includes("503") || msg.includes("504")) return true;
  if (msg.includes("aborted") || msg.includes("abort")) return true;

  // Unknown errors — retry once (pessimistic)
  return true;
}

/**
 * Calculate the delay for a given attempt (0-indexed).
 */
export function delayForAttempt(
  policy: RetryPolicy,
  attempt: number,
): number {
  switch (policy.strategy) {
    case "exponential":
      return Math.min(
        policy.baseDelayMs * 2 ** attempt,
        policy.maxTotalDelayMs,
      );
    case "linear":
      return Math.min(
        policy.baseDelayMs * (attempt + 1),
        policy.maxTotalDelayMs,
      );
    case "fixed":
      return policy.baseDelayMs;
  }
}

/**
 * Execute a function with retry logic.
 * Returns the result on first success.
 * Throws the last error if all attempts exhausted.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: Partial<RetryPolicy> = {},
): Promise<{ result: T; attempts: number }> {
  const resolved = { ...DEFAULT_RETRY_POLICY, ...policy };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < resolved.maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      return { result, attempts: attempt + 1 };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Do not retry if the policy says no
      if (!resolved.shouldRetry(lastError)) {
        throw lastError;
      }

      // Last attempt — don't sleep, throw immediately
      if (attempt < resolved.maxAttempts - 1) {
        const delay = delayForAttempt(resolved, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Retry exhausted with no error captured");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
