/* ═══════════════════════════════════════════
   Eastmoney Stock Data Provider
   ───────────────────────────────────────────
   Free, no API key, no rate limits.
   Covers: A-shares (沪深京) + US stocks.
   ═══════════════════════════════════════════ */

import { fetchWithRetry } from "../fetcher";

const QUOTE_URL = "https://push2.eastmoney.com/api/qt/stock/get";
// K-line uses randomized subdomain for load balancing / access
function klineUrl(): string {
  const n = Math.floor(Math.random() * 99) + 1;
  return `https://${n}.push2his.eastmoney.com/api/qt/stock/kline/get`;
}

interface EMRaw {
  data?: {
    f43?: number; f44?: number; f45?: number; f46?: number;
    f47?: number; f48?: number; f57?: string; f58?: string;
    f60?: number; f116?: number; f117?: number; f169?: number; f170?: number;
  };
}

interface EMKlineRaw {
  data?: { klines?: string[] };
}

/* ── Ticker → secid mapping ── */

function isUSTicker(ticker: string): boolean {
  return /^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(ticker) && !/^\d+$/.test(ticker);
}

function toSecId(ticker: string): string {
  if (isUSTicker(ticker)) return `105.${ticker}`;
  // CN: 6xxxxx → 1.xxxxxx (SSE), others → 0.xxxxxx (SZSE/BSE)
  return ticker[0] === "6" ? `1.${ticker}` : `0.${ticker}`;
}

export function getMarketLabel(ticker: string): string {
  if (isUSTicker(ticker)) return "NYSE/NASDAQ";
  return ticker[0] === "6" ? "SSE" : "SZSE";
}

const FIELDS = "f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f169,f170";

/* ── Quote ── */

export async function fetchQuote(ticker: string): Promise<EMRaw> {
  const secid = toSecId(ticker);
  return fetchWithRetry<EMRaw>(`${QUOTE_URL}?secid=${secid}&fields=${FIELDS}`);
}

/* ── K-line ── */

export async function fetchKline(
  ticker: string,
  days: number = 120,
): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
  const us = isUSTicker(ticker);
  const secid = toSecId(ticker);
  const now = new Date();
  const end = now.toISOString().slice(0, 10).replace(/-/g, "");
  const start = new Date(now.getTime() - days * 2 * 86400000)
    .toISOString().slice(0, 10).replace(/-/g, "");

  const raw = await fetchWithRetry<EMKlineRaw>(
    `${klineUrl()}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=0&beg=${start}&end=${end}`,
  );
  const klines = raw.data?.klines;
  if (!klines || klines.length === 0) return [];

  return klines.map((line) => {
    const parts = line.split(",");
    // Format: date, open, close, high, low, volume, amount
    return {
      date: parts[0]!,
      open: r2(Number(parts[1])),
      close: r2(Number(parts[2])),
      high: r2(Number(parts[3])),
      low: r2(Number(parts[4])),
      volume: us ? Number(parts[5]) : Number(parts[5]) * 100,
    };
  });
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
