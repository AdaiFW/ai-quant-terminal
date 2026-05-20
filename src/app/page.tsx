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

  // Create chart once container has dimensions
  useEffect(() => {
    if (!chartRef.current) return;
    const container = chartRef.current;

    let chart: ReturnType<typeof createChart> | null = null;
    let cancelled = false;

    // Retry until container has width (flex layout may not be ready)
    function initChart() {
      if (cancelled || !container) return;
      if (container.clientWidth === 0) {
        requestAnimationFrame(initChart);
        return;
      }
      chart = createChart(container, {
        layout: { background: { type: ColorType.Solid, color: "#0A0E17" }, textColor: "#94A3B8" },
        grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
        crosshair: { mode: 0, vertLine: { color: "rgba(255,255,255,0.1)", style: 2 }, horzLine: { color: "rgba(255,255,255,0.1)", style: 2 } },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
        timeScale: { borderColor: "rgba(255,255,255,0.06)" },
        width: container.clientWidth,
        height: container.clientHeight,
      });
      chartApiRef.current = chart;

      const ro = new ResizeObserver(() => {
        if (container.clientWidth > 0) chart!.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      });
      ro.observe(container);
      // Store cleanup reference
      (container as Record<string, unknown>)._ro = ro;
    }

    requestAnimationFrame(initChart);

    return () => {
      cancelled = true;
      const ro = (container as Record<string, unknown>)._ro as ResizeObserver | undefined;
      ro?.disconnect();
      if (chart) { chart.remove(); chart = null; }
      chartApiRef.current = null;
    };
  }, []);

  // Update chart data when candles change
  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || candles.length === 0) return;

    chart.series().forEach((s) => chart.removeSeries(s));

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00C087", downColor: "#FF4D4F",
      borderUpColor: "#00C087", borderDownColor: "#FF4D4F",
      wickUpColor: "#00C087", wickDownColor: "#FF4D4F",
    });
    candleSeries.setData(candles.map((d: CandlePoint) => ({
      time: d.date as string, open: d.open, high: d.high, low: d.low, close: d.close,
    })));

    const ema20 = calcEMA(candles, 20);
    if (ema20.length > 0) {
      const emaSeries = chart.addSeries(LineSeries, { color: "#3B82F6", lineWidth: 1 });
      emaSeries.setData(ema20.map((v, i) => ({ time: candles[i]!.date as string, value: v })));
    }

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(148,163,184,0.3)", priceFormat: { type: "volume" }, priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    volSeries.setData(candles.map((d: CandlePoint) => ({
      time: d.date as string, value: d.volume,
      color: d.close >= d.open ? "rgba(0,192,135,0.4)" : "rgba(255,77,79,0.4)",
    })));

    chart.timeScale().fitContent();
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
                  <span className="text-sm font-bold tabular-nums font-mono text-[#E5E7EB]">
                    {tickerData.currency === "CNY" ? "¥" : "$"}{tickerData.currentPrice.toFixed(2)}
                  </span>
                  <span className={`text-xs font-mono tabular-nums ${tickerData.dailyChange >= 0 ? "text-[#00C087]" : "text-[#FF4D4F]"}`}>
                    {tickerData.dailyChange >= 0 ? "+" : ""}{tickerData.dailyChangePercent.toFixed(2)}%
                  </span>
                </>
              )}
              {!activeTicker && (
                <span className="text-xs text-[#94A3B8]/60 font-mono">Search a ticker to begin</span>
              )}
            </div>

            <div className="flex items-center gap-3">
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
        </aside>
      </div>
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

function mapSignal(sentiment: string, confidence: number): "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell" {
  if (sentiment === "Bullish") return confidence >= 75 ? "Strong Buy" : "Buy";
  if (sentiment === "Bearish") return confidence >= 75 ? "Strong Sell" : "Sell";
  return "Neutral";
}
