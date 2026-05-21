import { create } from "zustand";
import type { StockQuote, CandlePoint } from "@/types/stock";

interface AIQuantData {
  trendSignal: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";
  confidence: number;
  riskScore: number;
  support: number;
  resistance: number;
  momentum: number;
  volumeStrength: "High" | "Medium" | "Low";
  volatility: number;
  marketSentiment: "Bullish" | "Neutral" | "Bearish";
}

interface TickerItem {
  symbol: string;
  ticker?: string; // actual API ticker (e.g. "600519" for 茅台)
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

interface TerminalState {
  activeTicker: string;
  tickerData: StockQuote | null;
  candles: CandlePoint[];
  aiData: AIQuantData | null;
  watchlist: string[];
  tickerBar: TickerItem[];
  timeframe: string;
  isLoading: boolean;
  isAnalyzing: boolean;

  setActiveTicker: (t: string) => void;
  setTickerData: (d: StockQuote) => void;
  setCandles: (d: CandlePoint[]) => void;
  setAIData: (d: AIQuantData) => void;
  setWatchlist: (w: string[]) => void;
  setTickerBar: (t: TickerItem[]) => void;
  setTimeframe: (tf: string) => void;
  setLoading: (l: boolean) => void;
  setAnalyzing: (a: boolean) => void;
}

// Map display names to actual ticker codes
export const TICKER_MAP: Record<string, string> = {
  "茅台": "600519",
  "宁德": "300750",
  "比亚迪": "002594",
  "上证": "000001",
  "深证": "399001",
  "创业": "399006",
};

const DEFAULT_WATCHLIST = [
  // ── US: Magnificent 7 + Tech ──
  "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN", "META",
  // ── US: Semiconductors ──
  "AMD", "INTC", "QCOM", "AVGO", "TXN", "MU", "ASML", "AMAT",
  // ── US: Software & Cloud ──
  "CRM", "ADBE", "ORCL", "NOW", "SNOW", "PLTR", "CRWD", "DDOG",
  // ── US: Internet & E-commerce ──
  "NFLX", "BABA", "JD", "PDD", "SHOP", "UBER", "ABNB",
  // ── US: AI & Robotics ──
  "SMCI", "ARM", "RBLX", "COIN", "SOFI", "HOOD",
  // ── US: Finance ──
  "JPM", "GS", "MS", "BAC", "C", "WFC", "V", "MA", "AXP",
  // ── US: Consumer ──
  "WMT", "KO", "PEP", "MCD", "NKE", "SBUX", "HD", "LOW",
  // ── US: Energy & Industry ──
  "XOM", "CVX", "CAT", "GE", "BA", "RTX",
  // ── US: Healthcare ──
  "UNH", "JNJ", "PFE", "ABBV", "LLY", "MRK",
  // ── CN: Baijiu & Food ──
  "600519", "000858", "000568", "002304", "600809",
  // ── CN: Banks ──
  "000001", "600036", "601398", "601939", "601288", "002142",
  // ── CN: Insurance & Securities ──
  "601318", "600030", "601688", "601066",
  // ── CN: EV & Battery ──
  "002594", "300750", "601127", "600104", "000625",
  // ── CN: Tech & Chips ──
  "688981", "002415", "002475", "603501", "300059",
  // ── CN: Energy & Power ──
  "600900", "601899", "600585", "601012",
  // ── CN: Consumer Electronics ──
  "000333", "000651", "000725", "002714",
  // ── CN: Property & Infrastructure ──
  "000002", "600031", "601668", "600048",
  // ── CN: Pharma & Healthcare ──
  "603259", "300760", "000538", "600276", "300015",
  // ── CN: Rare earth & Materials ──
  "000063", "601600", "600111", "002460",
];
const DEFAULT_TICKERS: TickerItem[] = [
  // US
  { symbol: "AAPL", price: 302.25, change: 1.13, changePercent: 0.38, currency: "USD" },
  { symbol: "TSLA", price: 417.26, change: 5.40, changePercent: 1.41, currency: "USD" },
  { symbol: "NVDA", price: 223.47, change: -2.30, changePercent: -1.30, currency: "USD" },
  { symbol: "MSFT", price: 480.50, change: 3.20, changePercent: 0.70, currency: "USD" },
  { symbol: "GOOGL", price: 205.80, change: -1.40, changePercent: -0.68, currency: "USD" },
  { symbol: "AMZN", price: 238.90, change: 2.10, changePercent: 0.89, currency: "USD" },
  { symbol: "META", price: 625.30, change: 8.20, changePercent: 1.33, currency: "USD" },
  // CN indices
  { symbol: "上证", price: 3350, change: 8.2, changePercent: 0.25, currency: "CNY" },
  { symbol: "深证", price: 10890, change: 15.3, changePercent: 0.14, currency: "CNY" },
  // A-shares
  { symbol: "茅台", price: 1315, change: -9.3, changePercent: -0.70, currency: "CNY" },
  { symbol: "宁德", price: 218.50, change: 3.10, changePercent: 1.44, currency: "CNY" },
  { symbol: "比亚迪", price: 268.80, change: 4.20, changePercent: 1.59, currency: "CNY" },
];

export const useTerminalStore = create<TerminalState>((set) => ({
  activeTicker: "",
  tickerData: null,
  candles: [],
  aiData: null,
  watchlist: DEFAULT_WATCHLIST,
  tickerBar: DEFAULT_TICKERS,
  timeframe: "1M",
  isLoading: false,
  isAnalyzing: false,

  setActiveTicker: (t) => set({ activeTicker: t, tickerData: null, candles: [], aiData: null }),
  setTickerData: (d) => set({ tickerData: d, isLoading: false }),
  setCandles: (d) => set({ candles: d }),
  setAIData: (d) => set({ aiData: d, isAnalyzing: false }),
  setWatchlist: (w) => set({ watchlist: w }),
  setTickerBar: (t) => set({ tickerBar: t }),
  setTimeframe: (tf) => set({ timeframe: tf }),
  setLoading: (l) => set({ isLoading: l }),
  setAnalyzing: (a) => set({ isAnalyzing: a }),
}));
