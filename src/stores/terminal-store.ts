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

const DEFAULT_WATCHLIST = ["AAPL", "TSLA", "NVDA", "MSFT", "600519", "000001"];
const DEFAULT_TICKERS: TickerItem[] = [
  { symbol: "SPX", price: 5980, change: 12.3, changePercent: 0.21, currency: "USD" },
  { symbol: "NDX", price: 21340, change: -45.2, changePercent: -0.21, currency: "USD" },
  { symbol: "DJI", price: 44200, change: 85.6, changePercent: 0.19, currency: "USD" },
  { symbol: "VIX", price: 15.2, change: -0.8, changePercent: -5.0, currency: "USD" },
  { symbol: "BTC", price: 98740, change: 1240, changePercent: 1.27, currency: "USD" },
  { symbol: "ETH", price: 4210, change: 32, changePercent: 0.77, currency: "USD" },
  { symbol: "上证", price: 3350, change: 8.2, changePercent: 0.25, currency: "CNY" },
  { symbol: "深证", price: 10890, change: 15.3, changePercent: 0.14, currency: "CNY" },
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
