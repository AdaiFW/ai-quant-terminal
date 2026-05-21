import { z } from "zod";

/* ═══════════════════════════════════════════
   Stock Data Types — Request / Response
   ═══════════════════════════════════════════ */

// ── Input validation ──

export const tickerParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(10)
  .transform((s) => s.toUpperCase())
  .refine(
    (s) =>
      /^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(s) || // US: AAPL, BRK.B
      /^\d{6}$/.test(s),                          // CN: 600519, 000001
    {
      message: "Invalid ticker. US: AAPL | CN: 600519",
    },
  );

// ── Normalized API response ──

export interface StockQuote {
  ticker: string;
  currentPrice: number;
  dailyChange: number;
  dailyChangePercent: number;
  volume: number;
  marketCap: number | null;
  movingAverage50Day: number | null;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
  currency: string;
  exchange: string | null;
}

// ── API response envelope ──

export interface StockQuoteResponse {
  success: true;
  data: StockQuote;
  meta: {
    cached: boolean;
    cachedAt: string | null;
    provider: "finnhub" | "alphavantage";
    responseTimeMs: number;
  };
}

export interface StockErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export type StockApiResponse = StockQuoteResponse | StockErrorResponse;

// ── Raw provider shapes (internal) ──

export interface FinnhubQuoteRaw {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high price of the day
  l: number; // low price of the day
  o: number; // open price of the day
  pc: number; // previous close price
  t: number; // timestamp (unix seconds)
}

export interface FinnhubProfileRaw {
  name: string;
  ticker: string;
  marketCapitalization: number;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
}

export interface AlphaVantageQuoteRaw {
  "Global Quote": {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
}

// ── Provider interface ──

export type StockProvider = "eastmoney";

// ── Candlestick (OHLCV history) ──

export interface CandlePoint {
  date: string; // ISO date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleResponse {
  success: true;
  data: CandlePoint[];
  meta: {
    ticker: string;
    timeframe: string;
    count: number;
    provider: StockProvider;
  };
}

export interface CandleErrorResponse {
  success: false;
  error: { code: string; message: string };
}
