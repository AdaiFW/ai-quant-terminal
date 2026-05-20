/* ═══════════════════════════════════════════
   Reusable Zod Schema Fragments
   ───────────────────────────────────────────
   Compose these to build domain-specific
   AI output schemas. All schemas are strict()
   to reject extra properties.
   ═══════════════════════════════════════════ */

import { z } from "zod";

// ── Primitives ──

/** Integer confidence score, 0–100 inclusive. */
export const confidenceSchema = z
  .number()
  .min(0)
  .max(100)
  .describe("Confidence score from 0 (no confidence) to 100 (certain)");

/** Non-empty trimmed string, length bounded. */
export function boundedString(min: number, max: number) {
  return z.string().trim().min(min).max(max);
}

/** String enum with strict input validation. */
export function strictEnum<T extends readonly [string, ...string[]]>(
  values: T,
) {
  return z.enum(values);
}

// ── Financial domain ──

export const tickerSchema = z
  .string()
  .trim()
  .min(1)
  .max(10)
  .transform((s) => s.toUpperCase())
  .refine(
    (s) =>
      /^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(s) || /^\d{6}$/.test(s),
    {
      message: "Ticker must be 1-5 letters (US) or 6 digits (CN)",
    },
  );

export const sentimentSchema = z.enum(["Bullish", "Neutral", "Bearish"]);

export const riskLevelSchema = z.enum(["Low", "Medium", "High"]);

export const currencySchema = z
  .string()
  .length(3)
  .transform((s) => s.toUpperCase());

// ── Composite fragments ──

/** Key factors — 2 to 5 short strings. */
export const keyFactorsSchema = z
  .array(z.string().trim().min(5).max(200))
  .min(2)
  .max(5)
  .describe("2-5 key factors driving the analysis");

/** Summary — a non-empty string between 50 and 600 chars. */
export const summarySchema = z
  .string()
  .trim()
  .min(50)
  .max(600)
  .describe("Concise analysis summary, 50–600 characters");

/** Price in any currency (positive number, max 2M for stocks). */
export const priceSchema = z
  .number()
  .positive()
  .max(2_000_000);

/** Volume — non-negative integer. */
export const volumeSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

// ── Utility: strict() wrapper ──

/**
 * Wraps a zod object schema with .strict() to reject
 * extra properties. Use this on all AI output schemas.
 */
export function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}

// ── Pre-built AI output schemas ──

/** Standard AI analysis output shape. */
export const analysisOutputSchema = strictObject({
  summary: summarySchema,
  sentiment: sentimentSchema,
  risk_level: riskLevelSchema,
  confidence: confidenceSchema,
  key_factors: keyFactorsSchema,
});

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
