/* ═══════════════════════════════════════════
   Domain Errors
   ═══════════════════════════════════════════ */

export type ErrorCode =
  | "INVALID_TICKER"
  | "TICKER_NOT_FOUND"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_AUTH_FAILED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export class StockServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly retryable: boolean,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "StockServiceError";
  }
}

export class InvalidTickerError extends StockServiceError {
  constructor(ticker: string) {
    super(
      `"${ticker}" is not a recognized stock symbol.`,
      "TICKER_NOT_FOUND",
      false,
      404,
    );
  }
}

export class RateLimitError extends StockServiceError {
  constructor(provider: string) {
    super(
      `${provider} rate limit exceeded — retry after 60s.`,
      "RATE_LIMITED",
      true,
      429,
    );
  }
}

export class ProviderTimeoutError extends StockServiceError {
  constructor(provider: string) {
    super(
      `${provider} did not respond in time.`,
      "PROVIDER_TIMEOUT",
      true,
      504,
    );
  }
}
