/* ═══════════════════════════════════════════
   Eastmoney Stock Data Provider
   ───────────────────────────────────────────
   Free, no API key required.
   Covers all A-share (沪深京) stocks.
   Docs: unofficial but stable since 2015.
   ═══════════════════════════════════════════ */

import { fetchWithRetry } from "../fetcher";

const BASE_URL = "https://push2.eastmoney.com/api/qt/stock/get";

interface EMRaw {
  data?: {
    f43?: number; // 最新价
    f44?: number; // 最高
    f45?: number; // 最低
    f46?: number; // 开盘
    f47?: number; // 成交量 (手)
    f48?: number; // 成交额
    f57?: string; // 代码
    f58?: string; // 名称
    f60?: number; // 昨收
    f116?: number; // 总市值
    f117?: number; // 流通市值
    f169?: number; // 涨跌额
    f170?: number; // 涨跌幅 (%)
  };
}

/**
 * Map a 6-digit CN ticker to Eastmoney secid.
 *   6xxxxx → 1.xxxxxx (Shanghai)
 *   0xxxxx, 2xxxxx, 3xxxxx → 0.xxxxxx (Shenzhen)
 *   4xxxxx, 8xxxxx, 9xxxxx → 0.xxxxxx (Beijing)
 */
function toSecId(ticker: string): string {
  const first = ticker[0]!;
  if (first === "6") return `1.${ticker}`;
  return `0.${ticker}`;
}

const FIELDS =
  "f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f169,f170";

/**
 * Fetch real-time quote for a CN stock.
 */
export async function fetchQuote(ticker: string): Promise<EMRaw> {
  const secid = toSecId(ticker);
  const url = `${BASE_URL}?secid=${secid}&fields=${FIELDS}`;
  return fetchWithRetry<EMRaw>(url);
}

export function getMarketLabel(ticker: string): string {
  const first = ticker[0]!;
  if (first === "6") return "SSE";
  return "SZSE";
}

/* ── K-line (historical candlestick) ── */

interface EMKlineRaw {
  data?: {
    klines?: string[];
  };
}

/**
 * Fetch daily K-line data.
 * @param ticker 6-digit CN ticker
 * @param days Number of trading days to fetch (max ~200)
 */
export async function fetchKline(
  ticker: string,
  days: number = 120,
): Promise<
  {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[]
> {
  const secid = toSecId(ticker);
  const now = new Date();
  const end = now.toISOString().slice(0, 10).replace(/-/g, "");
  const start = new Date(now.getTime() - days * 2 * 86400000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const url =
    `https://push2his.eastmoney.com/api/qt/stock/kline/get` +
    `?secid=${secid}` +
    `&fields1=f1,f2,f3,f4,f5,f6` +
    `&fields2=f51,f52,f53,f54,f55,f56,f57` +
    `&klt=101&fqt=0&beg=${start}&end=${end}`;

  const raw = await fetchWithRetry<EMKlineRaw>(url);
  const klines = raw.data?.klines;
  if (!klines || klines.length === 0) return [];

  return klines.map((line) => {
    const parts = line.split(",");
    return {
      date: parts[0]!,
      open: Math.round(Number(parts[1]) * 100) / 100,
      high: Math.round(Number(parts[3]) * 100) / 100,
      low: Math.round(Number(parts[4]) * 100) / 100,
      close: Math.round(Number(parts[2]) * 100) / 100,
      volume: Number(parts[5]) * 100, // 手 → 股
    };
  });
}
