/* ═══════════════════════════════════════════
   Finnhub Data Provider
   ───────────────────────────────────────────
   Free tier: 60 calls/min, most endpoints.
   Docs: https://finnhub.io/docs/api
   ═══════════════════════════════════════════ */

import type {
  FinnhubProfileRaw,
  FinnhubQuoteRaw,
} from "@/types/stock";

const BASE_URL = "https://finnhub.io/api/v1";

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not set");
  }
  return key;
}

/**
 * Fetch real-time quote: price, change, volume, OHLC.
 */
export async function fetchQuote(ticker: string): Promise<FinnhubQuoteRaw> {
  const { fetchWithRetry } = await import("../fetcher");
  const url = `${BASE_URL}/quote?symbol=${ticker}&token=${apiKey()}`;
  return fetchWithRetry<FinnhubQuoteRaw>(url);
}

/**
 * Fetch company profile: name, market cap, sector, exchange.
 */
export async function fetchProfile(
  ticker: string,
): Promise<FinnhubProfileRaw | null> {
  const { fetchWithRetry } = await import("../fetcher");
  const url = `${BASE_URL}/stock/profile2?symbol=${ticker}&token=${apiKey()}`;
  const data = await fetchWithRetry<FinnhubProfileRaw>(url);
  // Finnhub returns empty object {} for unknown tickers
  if (!data || !data.ticker) return null;
  return data;
}

/**
 * Fetch historical candlestick data.
 * Resolution: D (daily), W (weekly), M (monthly)
 * Free tier: limited history.
 */
export async function fetchCandles(
  ticker: string,
  resolution: "D" | "W" | "M" = "D",
  from: number,
  to: number,
): Promise<{
  c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[];
} | null> {
  const { fetchWithRetry } = await import("../fetcher");
  const url = `${BASE_URL}/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey()}`;
  const data = await fetchWithRetry<{
    c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[]; s: string;
  }>(url);
  if (data.s === "no_data" || !data.c) return null;
  return data;
}

/**
 * Fetch SMA 50 indicator.
 * Fetches the last 100 daily candles to compute a reliable SMA.
 */
export async function fetchSMA50(
  ticker: string,
): Promise<number | null> {
  const { fetchWithRetry } = await import("../fetcher");
  const to = Math.floor(Date.now() / 1000);
  const from = to - 100 * 24 * 60 * 60; // ~100 trading days
  const url = `${BASE_URL}/indicator?symbol=${ticker}&resolution=D&from=${from}&to=${to}&indicator=sma&timeperiod=50&token=${apiKey()}`;

  try {
    const data = await fetchWithRetry<{
      sma: number[];
      s: string;
    }>(url);
    if (data.s === "ok" && data.sma.length > 0) {
      // Return the most recent SMA value that's not null
      for (let i = data.sma.length - 1; i >= 0; i--) {
        const val = data.sma[i];
        if (val !== null && val !== undefined) return val;
      }
    }
    return null;
  } catch {
    // SMA is non-critical — return null on failure
    return null;
  }
}
