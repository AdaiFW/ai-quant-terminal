/* ═══════════════════════════════════════════
   Route Handler: GET /api/stocks/:ticker
   ───────────────────────────────────────────
   Returns normalized stock quote data.
   Server-side only — no API keys exposed.
   ═══════════════════════════════════════════ */

import { NextResponse } from "next/server";
import type { StockApiResponse } from "@/types/stock";
import { getStockQuote } from "@/services/stocks/market-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
): Promise<NextResponse<StockApiResponse>> {
  const { ticker } = await params;

  const result = await getStockQuote(ticker);

  if (result.success) {
    return NextResponse.json(result, {
      status: 200,
      headers: cacheHeaders(result.meta.cached),
    });
  }

  const statusMap: Record<string, number> = {
    INVALID_TICKER: 400,
    TICKER_NOT_FOUND: 404,
    RATE_LIMITED: 429,
    PROVIDER_TIMEOUT: 504,
    PROVIDER_AUTH_FAILED: 500,
    PROVIDER_ERROR: 502,
    UPSTREAM_ERROR: 502,
    INTERNAL_ERROR: 500,
  };

  return NextResponse.json(result, {
    status: statusMap[result.error.code] ?? 500,
  });
}

function cacheHeaders(cached: boolean): Record<string, string> {
  if (cached) return {};
  return {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
  };
}
