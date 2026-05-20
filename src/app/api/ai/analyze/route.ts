/* ═══════════════════════════════════════════
   Route Handler: POST /api/ai/analyze
   ───────────────────────────────────────────
   Accepts stock market data, returns AI analysis.
   Server-side only — no API keys exposed.
   ═══════════════════════════════════════════ */

import { NextResponse } from "next/server";
import type { AIAnalysisApiResponse } from "@/types/ai-analysis";
import { analyzeStock } from "@/services/stocks/ai-analysis";

export async function POST(
  request: Request,
): Promise<NextResponse<AIAnalysisApiResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
          retryable: false,
          attempts: 0,
        },
      } satisfies AIAnalysisApiResponse,
      { status: 400 },
    );
  }

  const result = await analyzeStock(body as never);

  if (result.success) {
    return NextResponse.json(result, { status: 200 });
  }

  const statusMap: Record<string, number> = {
    INVALID_INPUT: 400,
    INVALID_JSON: 400,
    AI_VALIDATION_FAILED: 422,
    AI_TIMEOUT: 504,
    AI_RATE_LIMITED: 429,
    AI_AUTH_ERROR: 500,
    AI_GENERATION_FAILED: 502,
    UNKNOWN_ERROR: 500,
  };

  return NextResponse.json(result, {
    status: statusMap[result.error.code] ?? 500,
  });
}
