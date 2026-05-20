/* ═══════════════════════════════════════════
   Validation Layer — Barrel Export
   ═══════════════════════════════════════════ */

// Safe parser
export { safeJSONParse, safeJSONParseOrThrow } from "./safe-parser";
export type { ParseResult, ParseError, SafeParseOutcome } from "./safe-parser";

// Reusable schemas
export {
  confidenceSchema,
  tickerSchema,
  sentimentSchema,
  riskLevelSchema,
  currencySchema,
  keyFactorsSchema,
  summarySchema,
  priceSchema,
  volumeSchema,
  strictObject,
  analysisOutputSchema,
} from "./schemas";
export type { AnalysisOutput } from "./schemas";

// Retry
export {
  withRetry,
  isTransientError,
  delayForAttempt,
  DEFAULT_RETRY_POLICY,
} from "./retry";
export type { RetryPolicy } from "./retry";

// Core validator
export {
  generateValidatedObject,
  ValidationError,
} from "./validator";
export type { ValidationOptions, ValidationResult } from "./validator";
