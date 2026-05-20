/* ═══════════════════════════════════════════
   Route: GET /api/stocks/:ticker/candles
   Returns daily OHLCV candlestick data.
   ═══════════════════════════════════════════ */

import { NextResponse } from "next/server";
import type { CandlePoint } from "@/types/stock";
import { tickerParamSchema } from "@/types/stock";
import { withCache } from "@/lib/api/cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
): Promise<NextResponse> {
  const { ticker: raw } = await params;
  const parsed = tickerParamSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TICKER", message: parsed.error.issues[0]?.message } },
      { status: 400 },
    );
  }
  const ticker = parsed.data;

  const isCN = /^\d{6}$/.test(ticker);

  try {
    const provider = isCN ? "eastmoney" : "finnhub";
    const { data, cached } = await withCache(
      `candles:${ticker}:D:120`,
      () => fetchCandles(ticker, isCN),
    );

    return NextResponse.json(
      {
        success: true,
        data,
        meta: { ticker, timeframe: "D", count: data.length, provider },
      },
      {
        status: 200,
        headers: cached
          ? {}
          : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      },
      { status: 500 },
    );
  }
}

async function fetchCandles(ticker: string, isCN: boolean): Promise<CandlePoint[]> {
  if (isCN) {
    const { fetchKline } = await import("@/lib/api/providers/eastmoney");
    return fetchKline(ticker, 120);
  }

  const { fetchCandles: fetchFinnhub } = await import("@/lib/api/providers/finnhub");
  const to = Math.floor(Date.now() / 1000);
  const from = to - 120 * 24 * 60 * 60; // ~120 trading days
  const raw = await fetchFinnhub(ticker, "D", from, to);

  if (!raw) return [];

  return raw.t.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    open: raw.o[i]!,
    high: raw.h[i]!,
    low: raw.l[i]!,
    close: raw.c[i]!,
    volume: raw.v[i] ?? 0,
  }));
}
