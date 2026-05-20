import { z } from "zod";

/* ═══════════════════════════════════════════
   AI Analysis — Zod Schemas
   ═══════════════════════════════════════════ */

// ── LLM structured output (the contract) ──

export const sentimentEnum = z.enum(["Bullish", "Neutral", "Bearish"]);
export type Sentiment = z.infer<typeof sentimentEnum>;

export const riskLevelEnum = z.enum(["Low", "Medium", "High"]);
export type RiskLevel = z.infer<typeof riskLevelEnum>;

export const aiAnalysisOutputSchema = z.object({
  summary: z.string().min(50).max(600),
  sentiment: sentimentEnum,
  risk_level: riskLevelEnum,
  confidence: z.number().min(0).max(100),
  key_factors: z.array(z.string().min(5).max(200)).min(2).max(5),
});
export type AIAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;

// ── Request (what the client sends) ──

export const aiAnalysisRequestSchema = z.object({
  ticker: z.string().min(1).max(10).transform((s) => s.toUpperCase()),
  analysisType: z.enum(["TECHNICAL", "FUNDAMENTAL", "SENTIMENT", "COMPREHENSIVE"]),
  timeframe: z.enum(["INTRADAY", "DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
  stockData: z.object({
    currentPrice: z.number(),
    dailyChange: z.number(),
    dailyChangePercent: z.number(),
    volume: z.number(),
    marketCap: z.number().nullable().optional(),
    movingAverage50Day: z.number().nullable().optional(),
    high: z.number(),
    low: z.number(),
    open: z.number(),
    previousClose: z.number(),
    currency: z.string().default("USD"),
  }),
});
export type AIAnalysisRequest = z.infer<typeof aiAnalysisRequestSchema>;

// ── Response ──

export interface AIAnalysisSuccessResponse {
  success: true;
  data: AIAnalysisOutput;
  meta: {
    model: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    attempts: number;
    analysisId: string;
  };
}

export interface AIAnalysisErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    attempts: number;
  };
}

export type AIAnalysisApiResponse =
  | AIAnalysisSuccessResponse
  | AIAnalysisErrorResponse;
