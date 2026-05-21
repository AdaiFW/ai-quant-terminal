/* ═══════════════════════════════════════════
   Stock Market Data Service — Eastmoney only
   ═══════════════════════════════════════════ */

import type { StockQuote, StockQuoteResponse, StockErrorResponse } from "@/types/stock";
import { tickerParamSchema } from "@/types/stock";
import { withCache } from "@/lib/api/cache";
import { StockServiceError, InvalidTickerError } from "@/lib/api/errors";
import { upsertStockCache } from "@/lib/supabase/db";

function isCN(t: string): boolean { return /^\d{6}$/.test(t); }

export async function getStockQuote(
  rawTicker: string,
): Promise<StockQuoteResponse | StockErrorResponse> {
  const startedAt = performance.now();

  const parsed = tickerParamSchema.safeParse(rawTicker);
  if (!parsed.success) return errorResponse(new InvalidTickerError(rawTicker));
  const ticker = parsed.data;

  try {
    const { data, cached, cachedAt } = await withCache(
      `stock:quote:${ticker}`,
      () => fetchQuote(ticker),
    );

    return {
      success: true,
      data,
      meta: { cached, cachedAt, provider: "eastmoney", responseTimeMs: Math.round(performance.now() - startedAt) },
    };
  } catch (err) {
    if (err instanceof StockServiceError) return errorResponse(err);
    return errorResponse(new StockServiceError(
      err instanceof Error ? err.message : "Unexpected error", "INTERNAL_ERROR", false, 500,
    ));
  }
}

async function fetchQuote(ticker: string): Promise<StockQuote> {
  const { fetchQuote: emQuote, getMarketLabel } = await import("@/lib/api/providers/eastmoney");
  const raw = await emQuote(ticker);

  if (!raw.data || Object.keys(raw.data).length === 0) throw new InvalidTickerError(ticker);

  const d = raw.data;
  const cn = isCN(ticker);
  // Eastmoney returns prices in 分 — convert to currency units
  const price = (d.f43 ?? 0) / 100;
  const prevClose = (d.f60 ?? 0) / 100;
  const change = (d.f169 ?? 0) / 100;
  const changePercent = (d.f170 ?? 0) / 100;

  const result: StockQuote = {
    ticker: d.f57 ?? ticker,
    currentPrice: r2(price),
    dailyChange: r2(change),
    dailyChangePercent: r2(changePercent),
    volume: cn ? (d.f47 ?? 0) * 100 : (d.f47 ?? 0),
    marketCap: d.f116 ?? null,
    movingAverage50Day: null,
    high: r2((d.f44 ?? 0) / 100),
    low: r2((d.f45 ?? 0) / 100),
    open: r2((d.f46 ?? 0) / 100),
    previousClose: r2(prevClose),
    timestamp: new Date().toISOString(),
    currency: cn ? "CNY" : "USD",
    exchange: getMarketLabel(ticker),
  };

  // Persist to Supabase stock_cache via REST API (HTTPS, non-blocking)
  upsertStockCache({
    ticker: result.ticker,
    name: d.f58 ?? result.ticker,
    currency: result.currency,
    exchange: result.exchange,
    priceData: {
      price: result.currentPrice,
      high: result.high,
      low: result.low,
      open: result.open,
      prevClose: result.previousClose,
      volume: result.volume,
      change: result.dailyChange,
      changePercent: result.dailyChangePercent,
    },
  }).catch(() => { /* non-blocking */ });

  return result;
}

function r2(n: number): number { return Math.round(n * 100) / 100; }

function errorResponse(err: StockServiceError): StockErrorResponse {
  return { success: false, error: { code: err.code, message: err.message, retryable: err.retryable } };
}
