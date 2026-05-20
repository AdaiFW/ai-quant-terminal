/* ═══════════════════════════════════════════
   Core Validator — generateText + zod + retry
   ───────────────────────────────────────────
   Uses generateText (not generateObject) for
   maximum provider compatibility (DeepSeek,
   OpenAI, Anthropic, Google).
   ═══════════════════════════════════════════ */

import { generateText, type LanguageModelV1 } from "ai";
import type { ZodSchema } from "zod";
import { safeJSONParse } from "./safe-parser";
import { withRetry, isTransientError, type RetryPolicy } from "./retry";
import { DEFAULT_RETRY_POLICY } from "./retry";

/* ── Types ── */

export interface ValidationOptions {
  retry?: Partial<RetryPolicy>;
  maxTokens?: number;
  temperature?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface ValidationResult<T> {
  data: T;
  meta: {
    attempts: number;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    warnings: string[];
  };
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly attempts: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/* ── Main API ── */

export async function generateValidatedObject<T>({
  model,
  schema,
  system,
  prompt,
  options = {},
}: {
  model: LanguageModelV1;
  schema: ZodSchema<T>;
  system: string;
  prompt: string;
  options?: ValidationOptions;
}): Promise<ValidationResult<T>> {
  const {
    retry: retryPolicy,
    maxTokens = 4096,
    temperature = 0.1,
    onRetry,
  } = options;

  const startedAt = performance.now();

  const { result, attempts } = await withRetry(
    async (_attempt) => {
      const res = await generateText({
        model,
        system,
        prompt,
        temperature,
        maxTokens,
      });

      const text = res.text || "";
      const parsed = safeJSONParse<T>(text);

      if (!parsed.ok) {
        throw new Error(`JSON parse failed: ${parsed.error}`);
      }

      const zodResult = schema.safeParse(parsed.data);
      if (!zodResult.success) {
        const issues = zodResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Schema validation failed: ${issues}`);
      }

      return {
        data: zodResult.data,
        tokensInput: res.usage?.promptTokens ?? 0,
        tokensOutput: res.usage?.completionTokens ?? 0,
        warnings: parsed.warnings,
      };
    },
    { ...DEFAULT_RETRY_POLICY, ...retryPolicy },
  );

  const latencyMs = Math.round(performance.now() - startedAt);

  return {
    data: result.data,
    meta: {
      attempts,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      latencyMs,
      warnings: result.warnings,
    },
  };
}
