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

  try {
    const provider = "eastmoney";
    const { data, cached } = await withCache(
      `candles:${ticker}:D:120`,
      async () => {
        const { fetchKline } = await import("@/lib/api/providers/eastmoney");
        return fetchKline(ticker, 120);
      },
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
      { status: 502 },
    );
  }
}
