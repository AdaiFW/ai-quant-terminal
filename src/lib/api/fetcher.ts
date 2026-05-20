/* ═══════════════════════════════════════════
   HTTP Fetcher — retry + timeout + rate-limit
   ═══════════════════════════════════════════ */

import { RateLimitError, ProviderTimeoutError } from "./errors";

interface FetchOptions {
  /** Timeout in ms (default 10s) */
  timeout?: number;
  /** Max retry attempts (default 2) */
  retries?: number;
  /** Base delay for exponential backoff (default 1000ms) */
  retryBaseMs?: number;
}

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BASE_MS = 1_000;

/**
 * Fetch with:
 * - AbortController timeout
 * - Exponential backoff retry (1s, 2s, 4s)
 * - Rate-limit detection (429 → throws RateLimitError)
 */
export async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryBaseMs = DEFAULT_BASE_MS,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });

      // Rate limited — do not retry, bubble up immediately
      if (response.status === 429) {
        throw new RateLimitError(getProviderName(url));
      }

      // Auth failure — do not retry
      if (response.status === 401 || response.status === 403) {
        throw new RateLimitError(getProviderName(url)); // reuses auth error
      }

      // Client error (4xx non-429/401/403) — no retry
      if (response.status >= 400 && response.status < 500) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
      }

      // Server error (5xx) — retry if attempts remain
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on abort (timeout)
      if (err instanceof DOMException && err.name === "AbortError") {
        // Retry on timeout if attempts remain
        if (attempt < retries) {
          await sleep(retryBaseMs * 2 ** attempt);
          continue;
        }
        throw new ProviderTimeoutError(getProviderName(url));
      }

      // Don't retry rate-limit errors
      if (lastError instanceof RateLimitError) {
        throw lastError;
      }

      // Retry on server errors
      if (attempt < retries) {
        await sleep(retryBaseMs * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Unknown fetch error");
}

function getProviderName(url: string): string {
  if (url.includes("finnhub")) return "Finnhub";
  if (url.includes("alphavantage")) return "Alpha Vantage";
  return "Provider";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
