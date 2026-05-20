/* ═══════════════════════════════════════════
   Stock Market Data Service
   ───────────────────────────────────────────
   Orchestrates provider calls, normalization,
   caching, and fallback logic.
   ═══════════════════════════════════════════ */

import type {
  StockQuote,
  StockQuoteResponse,
  StockErrorResponse,
  StockProvider,
} from "@/types/stock";
import { tickerParamSchema } from "@/types/stock";
import { withCache } from "@/lib/api/cache";
import { StockServiceError, InvalidTickerError } from "@/lib/api/errors";

/* ── Provider selection ── */

type EffectiveProvider = StockProvider;

function resolveProvider(ticker: string): EffectiveProvider {
  // CN tickers (6-digit numeric) always use eastmoney
  if (/^\d{6}$/.test(ticker)) return "eastmoney";
  const configured = process.env.STOCK_PROVIDER as StockProvider | undefined;
  return configured || "finnhub";
}

/* ── Cache key ── */

function cacheKey(ticker: string): string {
  return `stock:quote:${ticker}`;
}

/* ── Main entry ── */

export async function getStockQuote(
  rawTicker: string,
): Promise<StockQuoteResponse | StockErrorResponse> {
  const startedAt = performance.now();

  // 1. Validate input
  const parsed = tickerParamSchema.safeParse(rawTicker);
  if (!parsed.success) {
    return errorResponse(new InvalidTickerError(rawTicker));
  }
  const ticker = parsed.data;

  // 2. Fetch with cache
  const provider = resolveProvider(ticker);
  try {
    const { data, cached, cachedAt } = await withCache(
      cacheKey(ticker),
      () => fetchAndNormalize(ticker, provider),
    );

    const responseTimeMs = Math.round(performance.now() - startedAt);

    return {
      success: true,
      data,
      meta: {
        cached,
        cachedAt,
        provider,
        responseTimeMs,
      },
    };
  } catch (err) {
    if (err instanceof StockServiceError) {
      return errorResponse(err);
    }
    return errorResponse(
      new StockServiceError(
        err instanceof Error ? err.message : "Unexpected error",
        "INTERNAL_ERROR",
        false,
        500,
      ),
    );
  }
}

/* ── Core normalization pipeline ── */

async function fetchAndNormalize(
  ticker: string,
  provider: EffectiveProvider,
): Promise<StockQuote> {
  if (provider === "eastmoney") return fetchFromEastmoney(ticker);
  if (provider === "finnhub") return fetchFromFinnhub(ticker);
  return fetchFromAlphaVantage(ticker);
}

async function fetchFromFinnhub(ticker: string): Promise<StockQuote> {
  const { fetchQuote, fetchProfile, fetchSMA50 } = await import(
    "@/lib/api/providers/finnhub"
  );

  // Fire quote + profile in parallel; SMA is optional
  const [quote, profile, sma50] = await Promise.all([
    fetchQuote(ticker),
    fetchProfile(ticker).catch(() => null),
    fetchSMA50(ticker).catch(() => null),
  ]);

  // Finnhub returns c=0 for invalid tickers (no data)
  if (quote.c === 0 && quote.h === 0 && quote.l === 0 && quote.o === 0) {
    throw new InvalidTickerError(ticker);
  }

  return {
    ticker,
    currentPrice: quote.c,
    dailyChange: quote.d,
    dailyChangePercent: quote.dp,
    volume: 0, // Finnhub quote doesn't include volume
    marketCap: profile?.marketCapitalization
      ? profile.marketCapitalization * 1_000_000
      : null,
    movingAverage50Day: sma50,
    high: quote.h,
    low: quote.l,
    open: quote.o,
    previousClose: quote.pc,
    timestamp: new Date(quote.t * 1000).toISOString(),
    currency: profile?.currency ?? "USD",
    exchange: profile?.exchange ?? null,
  };
}

async function fetchFromAlphaVantage(ticker: string): Promise<StockQuote> {
  const { fetchQuote, fetchOverview } = await import(
    "@/lib/api/providers/alpha-vantage"
  );

  const [quote, overview] = await Promise.all([
    fetchQuote(ticker),
    fetchOverview(ticker).catch(() => null),
  ]);

  const gq = quote["Global Quote"];

  return {
    ticker: gq["01. symbol"],
    currentPrice: Number(gq["05. price"]),
    dailyChange: Number(gq["09. change"]),
    dailyChangePercent: Number(
      gq["10. change percent"].replace("%", ""),
    ),
    volume: Number(gq["06. volume"]),
    marketCap: overview
      ? Number(overview.MarketCapitalization)
      : null,
    movingAverage50Day: null, // Alpha Vantage free tier — separate call needed
    high: Number(gq["03. high"]),
    low: Number(gq["04. low"]),
    open: Number(gq["02. open"]),
    previousClose: Number(gq["08. previous close"]),
    timestamp: gq["07. latest trading day"],
    currency: overview?.Currency ?? "USD",
    exchange: overview?.Exchange ?? null,
  };
}

async function fetchFromEastmoney(ticker: string): Promise<StockQuote> {
  const { fetchQuote, getMarketLabel } = await import(
    "@/lib/api/providers/eastmoney"
  );

  const raw = await fetchQuote(ticker);

  if (!raw.data || Object.keys(raw.data).length === 0) {
    throw new InvalidTickerError(ticker);
  }

  const d = raw.data;
  // Eastmoney returns prices in 分 (1/100 yuan) — convert to 元
  const price = (d.f43 ?? 0) / 100;
  const prevClose = (d.f60 ?? 0) / 100;
  const change = (d.f169 ?? 0) / 100;
  // f170 is basis points (e.g., -70 = -0.70%)
  const changePercent = (d.f170 ?? 0) / 100;

  return {
    ticker: d.f57 ?? ticker,
    currentPrice: Math.round(price * 100) / 100,
    dailyChange: Math.round(change * 100) / 100,
    dailyChangePercent: Math.round(changePercent * 100) / 100,
    volume: (d.f47 ?? 0) * 100, // 手 → 股
    marketCap: d.f116 ?? null, // 元
    movingAverage50Day: null,
    high: Math.round(((d.f44 ?? 0) / 100) * 100) / 100,
    low: Math.round(((d.f45 ?? 0) / 100) * 100) / 100,
    open: Math.round(((d.f46 ?? 0) / 100) * 100) / 100,
    previousClose: Math.round(prevClose * 100) / 100,
    timestamp: new Date().toISOString(),
    currency: "CNY",
    exchange: getMarketLabel(ticker),
  };
}

/* ── Helpers ── */

function errorResponse(err: StockServiceError): StockErrorResponse {
  return {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      retryable: err.retryable,
    },
  };
}
