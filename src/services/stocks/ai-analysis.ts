/* ═══════════════════════════════════════════
   AI Stock Analysis Service
   ───────────────────────────────────────────
   Now delegates to the validation layer for
   structured output, retry, and safe parsing.
   ═══════════════════════════════════════════ */

import { analysisModel } from "@/lib/ai/provider";
import { buildAnalysisPrompt } from "@/lib/ai/prompts/stock-analysis";
import {
  generateValidatedObject,
  ValidationError,
} from "@/lib/ai/validation";
import { aiAnalysisOutputSchema } from "@/types/ai-analysis";
import { insertAnalysis, insertAILog } from "@/lib/supabase/db";
import {
  type AIAnalysisRequest,
  type AIAnalysisApiResponse,
  aiAnalysisRequestSchema,
} from "@/types/ai-analysis";

/* ── Public API ── */

export async function analyzeStock(
  raw: AIAnalysisRequest,
): Promise<AIAnalysisApiResponse> {
  // 1. Validate input
  const parsed = aiAnalysisRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: parsed.error.issues.map((i) => i.message).join("; "),
        retryable: false,
        attempts: 0,
      },
    };
  }
  const request = parsed.data;

  // 2. Build prompt
  const { system, prompt } = buildAnalysisPrompt(request);

  // 3. Generate validated object (handles retry + safe parse + zod)
  try {
    const result = await generateValidatedObject({
      model: analysisModel,
      schema: aiAnalysisOutputSchema,
      system,
      prompt,
      options: {
        fallbackParse: true,
        onRetry: (attempt, error) => {
          console.warn(
            `[AI Analysis] Retry ${attempt + 1}: ${error.message}`,
          );
        },
      },
    });

    // 4. Persist to Supabase
    const analysisId = await persistAnalysis({
      request,
      result: result.data as Record<string, unknown>,
      tokensInput: result.meta.tokensInput,
      tokensOutput: result.meta.tokensOutput,
      latencyMs: result.meta.latencyMs,
      fallbackUsed: result.meta.fallbackUsed,
    }).catch((err) => {
      console.error("Failed to persist analysis:", err);
      return null;
    });

    return {
      success: true,
      data: result.data,
      meta: {
        model: process.env.AI_MODEL || "deepseek-chat",
        tokensInput: result.meta.tokensInput,
        tokensOutput: result.meta.tokensOutput,
        latencyMs: result.meta.latencyMs,
        attempts: result.meta.attempts,
        analysisId: analysisId ?? "local",
      },
    };
  } catch (err) {
    const attempts =
      err instanceof ValidationError ? err.attempts : 0;
    await logFailedAttempt(request, err, 0);

    if (err instanceof ValidationError) {
      return {
        success: false,
        error: {
          code: "AI_VALIDATION_FAILED",
          message: err.message,
          retryable: false,
          attempts,
        },
      };
    }

    const error = err instanceof Error ? err : new Error(String(err));
    return {
      success: false,
      error: {
        code: "AI_GENERATION_FAILED",
        message: error.message,
        retryable: false,
        attempts,
      },
    };
  }
}

/* ── Persistence ── */

interface PersistParams {
  request: AIAnalysisRequest;
  result: Record<string, unknown>;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  fallbackUsed: boolean;
}

async function persistAnalysis(p: PersistParams): Promise<string> {
  const { data: analysis } = await insertAnalysis({
    ticker: p.request.ticker,
    analysisType: p.request.analysisType,
    timeframe: p.request.timeframe,
    parameters: {
      currentPrice: p.request.stockData.currentPrice,
      dailyChangePercent: p.request.stockData.dailyChangePercent,
      volume: p.request.stockData.volume,
      fallbackUsed: p.fallbackUsed,
    },
    result: p.result,
    confidenceScore: (p.result as { confidence: number }).confidence,
    durationMs: p.latencyMs,
  });

  const analysisId = analysis?.id;

  await insertAILog({
    analysisId,
    provider: "DEEPSEEK",
    model: process.env.AI_MODEL || "deepseek-chat",
    response: p.result,
    tokensInput: p.tokensInput,
    tokensOutput: p.tokensOutput,
    latencyMs: p.latencyMs,
    isSuccess: true,
  });

  return analysisId ?? "local";
}
}

async function logFailedAttempt(
  request: AIAnalysisRequest,
  error: unknown,
  latencyMs: number,
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    await insertAILog({
      provider: "DEEPSEEK",
      model: process.env.AI_MODEL || "deepseek-chat",
      response: { error: message },
      tokensInput: 0,
      tokensOutput: 0,
      latencyMs,
      isSuccess: false,
      errorType: "AI_GENERATION_FAILED",
      errorDetail: message,
    });
  } catch {
    // Non-critical
  }
}
