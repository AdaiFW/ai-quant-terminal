"use client";

import { useState, useCallback, useEffect } from "react";
import { LineChart, TrendingUp } from "lucide-react";
import { StockSearch } from "@/components/stock/stock-search";
import { StockCard } from "@/components/stock/stock-card";
import { AIAnalysisPanel } from "@/components/stock/ai-analysis-panel";
import { CandlestickChart } from "@/components/stock/candlestick-chart";
import {
  StockCardSkeleton,
  AnalysisPanelSkeleton,
} from "@/components/stock/stock-skeleton";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import type { StockQuote, CandlePoint } from "@/types/stock";
import type { AIAnalysisOutput } from "@/types/ai-analysis";

/* ── State ── */

type DashboardState =
  | { phase: "idle" }
  | { phase: "fetching_stock" }
  | { phase: "stock_loaded"; stock: StockQuote }
  | { phase: "analyzing"; stock: StockQuote }
  | { phase: "analysis_loaded"; stock: StockQuote; analysis: AIAnalysisOutput; meta: AnalysisMeta }
  | { phase: "stock_error"; error: string }
  | { phase: "analysis_error"; stock: StockQuote; error: string };

interface AnalysisMeta {
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  attempts: number;
}

/* ── Page ── */

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ phase: "idle" });
  const [candles, setCandles] = useState<CandlePoint[]>([]);
  const [candlesLoading, setCandlesLoading] = useState(false);

  const fetchStock = useCallback(async (ticker: string) => {
    setState({ phase: "fetching_stock" });
    setCandles([]);

    try {
      const res = await fetch(`/api/stocks/${ticker}`);
      const json = await res.json();

      if (!json.success) {
        setState({
          phase: "stock_error",
          error: json.error?.message ?? "Failed to fetch stock data",
        });
        return;
      }

      setState({ phase: "stock_loaded", stock: json.data });

      // Fetch candles in background
      setCandlesLoading(true);
      fetch(`/api/stocks/${ticker}/candles`)
        .then((r) => r.json())
        .then((d) => d.success && setCandles(d.data))
        .catch(() => {})
        .finally(() => setCandlesLoading(false));
    } catch (err) {
      setState({
        phase: "stock_error",
        error: err instanceof Error ? err.message : "Network error",
      });
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (state.phase !== "stock_loaded") return;
    const stock = state.stock;

    setState({ phase: "analyzing", stock });

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: stock.ticker,
          analysisType: "COMPREHENSIVE",
          timeframe: "DAILY",
          stockData: {
            currentPrice: stock.currentPrice,
            dailyChange: stock.dailyChange,
            dailyChangePercent: stock.dailyChangePercent,
            volume: stock.volume,
            marketCap: stock.marketCap,
            movingAverage50Day: stock.movingAverage50Day,
            high: stock.high,
            low: stock.low,
            open: stock.open,
            previousClose: stock.previousClose,
            currency: stock.currency,
          },
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setState({ phase: "analysis_error", stock, error: json.error?.message ?? "AI analysis failed" });
        return;
      }

      setState({ phase: "analysis_loaded", stock, analysis: json.data, meta: json.meta });
    } catch (err) {
      setState({ phase: "analysis_error", stock, error: err instanceof Error ? err.message : "Network error" });
    }
  }, [state]);

  const handleRetryStock = useCallback(() => {
    if (state.phase !== "stock_error") return;
    setState({ phase: "idle" });
  }, [state]);

  const handleRetryAnalysis = useCallback(() => {
    if (state.phase !== "analysis_error") return;
    setState({ phase: "stock_loaded", stock: state.stock });
  }, [state]);

  const isStockLoaded =
    state.phase === "stock_loaded" ||
    state.phase === "analyzing" ||
    state.phase === "analysis_loaded" ||
    state.phase === "analysis_error";

  return (
    <div className="container py-8">
      {/* Hero */}
      <section className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Market Intelligence</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered stock analysis with real-time data
            </p>
          </div>
          <StockSearch
            onSelect={fetchStock}
            isLoading={state.phase === "fetching_stock"}
            disabled={state.phase === "analyzing"}
          />
        </div>
      </section>

      {/* Idle */}
      {state.phase === "idle" && <EmptyState />}

      {/* Loading */}
      {state.phase === "fetching_stock" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <StockCardSkeleton />
          <div className="hidden lg:block" />
        </div>
      )}

      {/* Stock Error */}
      {state.phase === "stock_error" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ErrorMessage title="Could not load stock data" message={state.error} retryable onRetry={handleRetryStock} />
        </div>
      )}

      {/* Stock loaded → 左列: 股票卡片 + K线 | 右列: AI 分析 */}
      {isStockLoaded && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Stock Card + K-line */}
          <div className="space-y-4">
            <StockCard data={state.stock} />

            {/* K-line chart — always show when stock data available */}
            {candlesLoading ? (
              <ChartSkeleton height={360} />
            ) : candles.length > 0 ? (
              <CandlestickChart data={candles} height={360} />
            ) : null}

            {state.phase === "stock_loaded" && (
              <button
                onClick={runAnalysis}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
              >
                <LineChart className="h-4 w-4" />
                Run AI Analysis
              </button>
            )}
          </div>

          {/* Right: AI Analysis */}
          <div>
            {state.phase === "analyzing" && <AnalysisPanelSkeleton />}
            {state.phase === "analysis_loaded" && (
              <AIAnalysisPanel data={state.analysis} meta={state.meta} />
            )}
            {state.phase === "analysis_error" && (
              <ErrorMessage
                title="AI analysis failed"
                message={state.error}
                retryable
                onRetry={handleRetryAnalysis}
              />
            )}
            {/* Show empty placeholder when stock loaded but no analysis yet */}
            {(state.phase === "stock_loaded") && (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-card/50 text-sm text-muted-foreground">
                Click &ldquo;Run AI Analysis&rdquo; to get AI insights
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Empty state ── */

function EmptyState() {
  const suggestions = ["AAPL", "TSLA", "600519", "000001", "NVDA"];
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <LineChart className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-lg font-semibold">Search a stock to begin</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Enter a ticker symbol above to get real-time market data and AI-driven analysis.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {suggestions.map((t) => (
          <span key={t} className="rounded-lg border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
