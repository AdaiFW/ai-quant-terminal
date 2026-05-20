/* ═══════════════════════════════════════════
   Alpha Vantage Data Provider
   ───────────────────────────────────────────
   Free tier: 25 calls/day. Use as fallback.
   Docs: https://www.alphavantage.co/documentation/
   ═══════════════════════════════════════════ */

import type { AlphaVantageQuoteRaw } from "@/types/stock";

const BASE_URL = "https://www.alphavantage.co/query";

function apiKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not set");
  }
  return key;
}

interface AVOverviewRaw {
  MarketCapitalization: string;
  Currency: string;
  Exchange: string;
  Name: string;
  Symbol: string;
}

/**
 * Fetch GLOBAL_QUOTE: current price, change, volume, OHLC.
 */
export async function fetchQuote(ticker: string): Promise<AlphaVantageQuoteRaw> {
  const { fetchWithRetry } = await import("../fetcher");
  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey()}`;
  const data = await fetchWithRetry<AlphaVantageQuoteRaw>(url);

  // Alpha Vantage returns empty object on unknown ticker
  if (!data["Global Quote"] || Object.keys(data["Global Quote"]).length === 0) {
    throw new Error(`No data found for ticker: ${ticker}`);
  }

  return data;
}

/**
 * Fetch company overview: market cap, sector, exchange.
 */
export async function fetchOverview(
  ticker: string,
): Promise<AVOverviewRaw | null> {
  const { fetchWithRetry } = await import("../fetcher");
  const url = `${BASE_URL}?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey()}`;
  try {
    const data = await fetchWithRetry<AVOverviewRaw>(url);
    if (!data || !data.Symbol) return null;
    return data;
  } catch {
    return null;
  }
}
