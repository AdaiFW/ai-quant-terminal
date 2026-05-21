/**
 * Supabase JS client for data access (HTTPS, no direct DB port needed).
 * Use this instead of Prisma for runtime data operations.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ── Stock Cache ──

export async function upsertStockCache(data: {
  ticker: string;
  name?: string;
  currency?: string;
  exchange?: string;
  priceData: Record<string, unknown>;
}) {
  return supabase.from("stock_cache").upsert({
    ticker: data.ticker,
    name: data.name || data.ticker,
    currency: data.currency || "USD",
    exchange: data.exchange || null,
    price_data: data.priceData,
    last_fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "ticker" });
}

// ── AI Analysis ──

export async function insertAnalysis(data: {
  ticker: string;
  analysisType: string;
  timeframe: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
  confidenceScore: number;
  durationMs: number;
  status?: string;
}) {
  return supabase.from("stock_analysis").insert({
    ticker: data.ticker,
    analysis_type: data.analysisType,
    timeframe: data.timeframe,
    parameters: data.parameters,
    result: data.result,
    confidence_score: data.confidenceScore,
    status: data.status || "COMPLETED",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    duration_ms: data.durationMs,
  }).select("id").single();
}

export async function insertAILog(data: {
  analysisId?: string;
  provider: string;
  model: string;
  response: Record<string, unknown>;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  isSuccess: boolean;
  errorType?: string;
  errorDetail?: string;
}) {
  return supabase.from("ai_logs").insert({
    analysis_id: data.analysisId || null,
    provider: data.provider,
    model: data.model,
    response: data.response,
    tokens_input: data.tokensInput,
    tokens_output: data.tokensOutput,
    tokens_total: data.tokensInput + data.tokensOutput,
    latency_ms: data.latencyMs,
    is_success: data.isSuccess,
    error_type: data.errorType || null,
    error_detail: data.errorDetail || null,
    created_at: new Date().toISOString(),
  });
}
