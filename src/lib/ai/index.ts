import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

/**
 * AI SDK provider instance (OpenAI / compatible).
 */
const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
  compatibility: "strict",
});

export const model = openai(env.AI_MODEL, {
  maxTokens: env.AI_MAX_TOKENS,
  temperature: env.AI_TEMPERATURE,
});

/**
 * Structured output generation with zod validation.
 */
export { generateObject, generateText, streamObject, streamText } from "ai";

/**
 * Validation layer — safe parser, retry, validator, reusable schemas.
 */
export {
  safeJSONParse,
  safeJSONParseOrThrow,
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
  withRetry,
  isTransientError,
  delayForAttempt,
  generateValidatedObject,
  ValidationError,
} from "./validation";
