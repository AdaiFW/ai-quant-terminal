"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
} from "lightweight-charts";
import { TickerBar } from "@/components/terminal/ticker-bar";
import { WatchlistPanel } from "@/components/terminal/watchlist-panel";
import { AIQuantPanel } from "@/components/terminal/ai-quant-panel";
import { FearGreedIndex } from "@/components/terminal/fear-greed";
import { TrendingStocks } from "@/components/terminal/trending-stocks";
import { StatusBar } from "@/components/terminal/status-bar";
import { useTerminalStore, TICKER_MAP } from "@/stores/terminal-store";
import type { CandlePoint } from "@/types/stock";

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export default function TerminalPage() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<ReturnType<typeof createChart> | null>(null);
  const {
    activeTicker, candles, aiData, watchlist, timeframe,
    setActiveTicker, setCandles, setAIData, setLoading, setAnalyzing,
    isLoading, isAnalyzing, tickerData, setTickerData, setTimeframe,
  } = useTerminalStore();

  // Fetch stock data
  const fetchTicker = useCallback(async (symbol: string) => {
    const ticker = TICKER_MAP[symbol] || symbol;
    setLoading(true);
    try {
      const [quoteRes, candleRes] = await Promise.all([
        fetch(`/api/stocks/${ticker}`),
        fetch(`/api/stocks/${ticker}/candles`),
      ]);
      const quote = await quoteRes.json();
      const candle = await candleRes.json();
      if (quote.success) setTickerData(quote.data);
      if (candle.success) setCandles(candle.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [setLoading, setTickerData, setCandles]);

  // Fetch AI analysis
  const runAnalysis = useCallback(async () => {
    if (!tickerData) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: tickerData.ticker,
          analysisType: "COMPREHENSIVE",
          timeframe: "DAILY",
          stockData: {
            currentPrice: tickerData.currentPrice,
            dailyChange: tickerData.dailyChange,
            dailyChangePercent: tickerData.dailyChangePercent,
            volume: tickerData.volume,
            marketCap: tickerData.marketCap,
            movingAverage50Day: tickerData.movingAverage50Day,
            high: tickerData.high, low: tickerData.low,
            open: tickerData.open, previousClose: tickerData.previousClose,
            currency: tickerData.currency,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        const d = json.data as Record<string, unknown>;
        setAIData({
          trendSignal: mapSignal(d.sentiment as string, d.confidence as number),
          confidence: d.confidence as number,
          riskScore: d.risk_level === "High" ? 7.5 : d.risk_level === "Medium" ? 4.5 : 2,
          support: tickerData.currentPrice * 0.97,
          resistance: tickerData.currentPrice * 1.04,
          momentum: tickerData.dailyChangePercent,
          volumeStrength: tickerData.volume > 50_000_000 ? "High" : tickerData.volume > 10_000_000 ? "Medium" : "Low",
          volatility: 2.3,
          marketSentiment: d.sentiment as "Bullish" | "Neutral" | "Bearish",
        });
      }
    } catch { /* silent */ }
    setAnalyzing(false);
  }, [tickerData, setAnalyzing, setAIData]);

  useEffect(() => { if (activeTicker) fetchTicker(activeTicker); }, [activeTicker, fetchTicker]);

  // Create chart when candles data arrives
  useEffect(() => {
    if (candles.length === 0) return;
    const container = chartRef.current;
    if (!container) return;

    // Destroy old chart
    if (chartApiRef.current) {
      chartApiRef.current.remove();
      chartApiRef.current = null;
    }

    const chart = createChart(container, {
      layout: { background: { type: ColorType.Solid, color: "#0A0E17" }, textColor: "#94A3B8" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      crosshair: { mode: 0, vertLine: { color: "rgba(255,255,255,0.1)", style: 2 }, horzLine: { color: "rgba(255,255,255,0.1)", style: 2 } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: { borderColor: "rgba(255,255,255,0.06)" },
      width: container.clientWidth,
      height: container.clientHeight,
    });
    chartApiRef.current = chart;

    // Candlestick
    chart.addSeries(CandlestickSeries, {
      upColor: "#00C087", downColor: "#FF4D4F",
      borderUpColor: "#00C087", borderDownColor: "#FF4D4F",
      wickUpColor: "#00C087", wickDownColor: "#FF4D4F",
    }).setData(candles.map((d: CandlePoint) => ({
      time: d.date as string, open: d.open, high: d.high, low: d.low, close: d.close,
    })));

    // EMA 20 + 50
    const ema20 = calcEMA(candles, 20);
    const ema50 = calcEMA(candles, 50);
    if (ema20.length > 0) {
      chart.addSeries(LineSeries, { color: "#3B82F6", lineWidth: 1 })
        .setData(ema20.map((v, i) => ({ time: candles[i]!.date as string, value: v })));
    }
    if (ema50.length > 0) {
      chart.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 1, lineStyle: 2 })
        .setData(ema50.map((v, i) => ({ time: candles[i]!.date as string, value: v })));
    }

    // Volume
    chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" }, priceScaleId: "vol",
    }).setData(candles.map((d: CandlePoint) => ({
      time: d.date as string, value: d.volume,
      color: d.close >= d.open ? "rgba(0,192,135,0.4)" : "rgba(255,77,79,0.4)",
    })));
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 }, visible: false });

    // Bollinger Bands
    const bb = calcBollinger(candles, 20, 2);
    if (bb.length > 0) {
      chart.addSeries(LineSeries, { color: "rgba(245,158,11,0.4)", lineWidth: 1, lastValueVisible: false })
        .setData(bb.map((d) => ({ time: candles[d.idx]!.date as string, value: d.upper })));
      chart.addSeries(LineSeries, { color: "rgba(139,92,246,0.4)", lineWidth: 1, lastValueVisible: false })
        .setData(bb.map((d) => ({ time: candles[d.idx]!.date as string, value: d.middle })));
      chart.addSeries(LineSeries, { color: "rgba(245,158,11,0.4)", lineWidth: 1, lastValueVisible: false })
        .setData(bb.map((d) => ({ time: candles[d.idx]!.date as string, value: d.lower })));
    }

    // VWAP
    const vwap = calcVWAP(candles);
    if (vwap.length > 0) {
      chart.addSeries(LineSeries, { color: "rgba(236,72,153,0.5)", lineWidth: 1, lineStyle: 3 })
        .setData(vwap.map((d) => ({ time: candles[d.idx]!.date as string, value: d.value })));
    }

    // MACD pane
    const macdPane = chart.addPane({ height: 120 });
    const macd = calcMACD(candles);
    if (macd.length > 0) {
      macdPane.addSeries(HistogramSeries, { color: "rgba(148,163,184,0.5)" })
        .setData(macd.map((d) => ({ time: candles[d.idx]!.date as string, value: d.histogram })));
      macdPane.addSeries(LineSeries, { color: "#3B82F6", lineWidth: 1 })
        .setData(macd.map((d) => ({ time: candles[d.idx]!.date as string, value: d.macd })));
      macdPane.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 1 })
        .setData(macd.map((d) => ({ time: candles[d.idx]!.date as string, value: d.signal })));
    }

    // RSI pane
    const rsiPane = chart.addPane({ height: 90 });
    const rsi = calcRSI(candles, 14);
    if (rsi.length > 0) {
      rsiPane.addSeries(LineSeries, { color: "#8B5CF6", lineWidth: 1 })
        .setData(rsi.map((d) => ({ time: candles[d.idx]!.date as string, value: d.value })));
      rsiPane.addSeries(LineSeries, { color: "rgba(255,77,79,0.3)", lineWidth: 1, lineStyle: 2, lastValueVisible: false })
        .setData(rsi.map((d) => ({ time: candles[d.idx]!.date as string, value: 70 })));
      rsiPane.addSeries(LineSeries, { color: "rgba(0,192,135,0.3)", lineWidth: 1, lineStyle: 2, lastValueVisible: false })
        .setData(rsi.map((d) => ({ time: candles[d.idx]!.date as string, value: 30 })));
    }

    const ro = new ResizeObserver(() => {
      if (container.clientWidth > 0) chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    });
    ro.observe(container);
    (container as Record<string, unknown>)._ro = ro;

    chart.timeScale().fitContent();
    return () => {
      ro.disconnect();
      chart.remove();
      chartApiRef.current = null;
    };
  }, [candles]);

  return (
    <div className="flex flex-col h-screen bg-[#0A0E17] text-[#E5E7EB] overflow-hidden">
      {/* Ticker bar */}
      <TickerBar />

      {/* Main grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Watchlist (narrow) */}
        <aside className="w-[180px] shrink-0 border-r border-white/[0.06] overflow-hidden">
          <WatchlistPanel />
        </aside>

        {/* Center: Chart + Toolbar */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[#0A0E17]">
            <div className="flex items-center gap-3">
              {activeTicker && tickerData && (
                <>
                  <span className="text-sm font-bold font-mono tracking-tight text-[#E5E7EB]">
                    {activeTicker}
                  </span>
                  <motion.span
                    key={tickerData.currentPrice}
                    animate={{ opacity: [0.7, 1] }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-bold tabular-nums font-mono text-[#E5E7EB]"
                  >
                    {tickerData.currency === "CNY" ? "¥" : "$"}{tickerData.currentPrice.toFixed(2)}
                  </motion.span>
                  <span className={`text-xs font-mono tabular-nums ${tickerData.dailyChange >= 0 ? "text-[#00C087]" : "text-[#FF4D4F]"}`}>
                    {tickerData.dailyChange >= 0 ? "+" : ""}{tickerData.dailyChangePercent.toFixed(2)}%
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Ticker search */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.target as HTMLFormElement).querySelector("input");
                  if (input?.value.trim()) {
                    const val = input.value.trim().toUpperCase();
                    fetchTicker(TICKER_MAP[val] || val);
                  }
                }}
                className="flex items-center"
              >
                <input
                  placeholder="Ticker..."
                  className="w-28 bg-white/[0.04] border border-white/[0.1] rounded-md px-2.5 py-1 text-xs font-mono text-[#E5E7EB] placeholder:text-[#94A3B8]/40 outline-none focus:border-[#3B82F6]/40 transition-colors"
                />
              </form>

              {/* Timeframes */}
              <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-md border border-white/[0.06] p-0.5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded transition-all ${
                      timeframe === tf
                        ? "bg-[#3B82F6]/20 text-[#3B82F6] font-semibold"
                        : "text-[#94A3B8] hover:text-[#E5E7EB]"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* AI button */}
              {activeTicker && !aiData && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={runAnalysis}
                  disabled={isAnalyzing || !tickerData}
                  className="flex items-center gap-1.5 rounded-md bg-[#3B82F6]/15 border border-[#3B82F6]/30 px-3 py-1.5 text-[11px] font-semibold text-[#3B82F6] font-mono hover:bg-[#3B82F6]/25 transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? "Analyzing..." : "AI Analysis"}
                </motion.button>
              )}
            </div>
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            <div ref={chartRef} className="absolute inset-0" />
            {candles.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[#94A3B8]/50 font-mono pointer-events-none">
                {isLoading ? "Loading..." : "Enter a ticker symbol to load chart"}
              </div>
            )}
          </div>
        </main>

        {/* Right: AI Quant Panel */}
        <aside className="w-[240px] shrink-0 border-l border-white/[0.06] overflow-y-auto bg-[#0A0E17]">
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider font-mono">
              AI Quant
            </span>
          </div>
          <AIQuantPanel />
          <FearGreedIndex />
          <TrendingStocks />
        </aside>
      </div>

      <StatusBar />
    </div>
  );
}

// Helpers
function calcEMA(data: CandlePoint[], period: number): number[] {
  const result: number[] = [];
  if (data.length < period) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i]!.close;
  const multiplier = 2 / (period + 1);
  let ema = sum / period;
  result[period - 1] = ema;
  for (let i = period; i < data.length; i++) {
    ema = (data[i]!.close - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

function calcBollinger(data: CandlePoint[], period: number, mult: number): { idx: number; upper: number; middle: number; lower: number }[] {
  const result: ReturnType<typeof calcBollinger>[] = [];
  if (data.length < period) return result;
  const sma = calcSMA(data, period);
  for (let i = 0; i < sma.length; i++) {
    const slice = data.slice(i, i + period);
    const mean = sma[i]!;
    let variance = 0;
    for (const d of slice) variance += (d.close - mean) ** 2;
    const std = Math.sqrt(variance / period);
    result.push({ idx: i + period - 1, upper: mean + mult * std, middle: mean, lower: mean - mult * std });
  }
  return result;
}

function calcSMA(data: CandlePoint[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j]!.close;
    result.push(sum / period);
  }
  return result;
}

function calcVWAP(data: CandlePoint[]): { idx: number; value: number }[] {
  const result: { idx: number; value: number }[] = [];
  let cumPV = 0, cumV = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data[i]!;
    const tp = (d.high + d.low + d.close) / 3;
    cumPV += tp * d.volume;
    cumV += d.volume;
    if (cumV > 0) result.push({ idx: i, value: cumPV / cumV });
  }
  return result;
}

function mapSignal(sentiment: string, confidence: number): "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell" {
  if (sentiment === "Bullish") return confidence >= 75 ? "Strong Buy" : "Buy";
  if (sentiment === "Bearish") return confidence >= 75 ? "Strong Sell" : "Sell";
  return "Neutral";
}

function calcMACD(data: CandlePoint[]): { idx: number; macd: number; signal: number; histogram: number }[] {
  const result: ReturnType<typeof calcMACD>[] = [];
  if (data.length < 26) return result;
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdVals: number[] = [];
  for (let i = 25; i < data.length; i++) {
    macdVals.push(ema12[i]! - ema26[i]!);
  }
  const sigVals = calcEMAVal(macdVals, 9);
  for (let i = 0; i < sigVals.length; i++) {
    const m = macdVals[i + 8]!;
    const s = sigVals[i]!;
    result.push({ idx: i + 34, macd: m, signal: s, histogram: m - s });
  }
  return result;
}

function calcEMAVal(values: number[], period: number): number[] {
  if (values.length < period) return [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i]!;
  const multiplier = 2 / (period + 1);
  let ema = sum / period;
  const result = [ema];
  for (let i = period; i < values.length; i++) {
    ema = (values[i]! - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

function calcRSI(data: CandlePoint[], period: number): { idx: number; value: number }[] {
  const result: { idx: number; value: number }[] = [];
  if (data.length < period + 1) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i]!.close - data[i - 1]!.close;
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result.push({ idx: period, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i]!.close - data[i - 1]!.close;
    avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    result.push({ idx: i, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  }
  return result;
}
