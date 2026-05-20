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
  // US stocks
  "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN", "META",
  // A-shares
  "600519", "000001", "000858", "600036", "000333", "002415",
];
const DEFAULT_TICKERS: TickerItem[] = [
  // US indices
  { symbol: "SPX", price: 5980, change: 12.3, changePercent: 0.21, currency: "USD" },
  { symbol: "NDX", price: 21340, change: -45.2, changePercent: -0.21, currency: "USD" },
  { symbol: "DJI", price: 44200, change: 85.6, changePercent: 0.19, currency: "USD" },
  { symbol: "VIX", price: 15.2, change: -0.8, changePercent: -5.0, currency: "USD" },
  // US tech
  { symbol: "AAPL", price: 298.97, change: 1.13, changePercent: 0.38, currency: "USD" },
  { symbol: "TSLA", price: 388.0, change: 5.40, changePercent: 1.41, currency: "USD" },
  { symbol: "NVDA", price: 175.20, change: -2.30, changePercent: -1.30, currency: "USD" },
  { symbol: "MSFT", price: 460.50, change: 3.20, changePercent: 0.70, currency: "USD" },
  // Crypto
  { symbol: "BTC", price: 98740, change: 1240, changePercent: 1.27, currency: "USD" },
  { symbol: "ETH", price: 4210, change: 32, changePercent: 0.77, currency: "USD" },
  // CN indices
  { symbol: "上证", price: 3350, change: 8.2, changePercent: 0.25, currency: "CNY" },
  { symbol: "深证", price: 10890, change: 15.3, changePercent: 0.14, currency: "CNY" },
  { symbol: "创业", price: 2280, change: -5.5, changePercent: -0.24, currency: "CNY" },
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
