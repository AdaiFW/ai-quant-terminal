"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  ColorType,
} from "lightweight-charts";
import type { CandlePoint } from "@/types/stock";

interface CandlestickChartProps {
  data: CandlePoint[];
  className?: string;
  height?: number;
}

export function CandlestickChart({
  data,
  className,
  height = 400,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#a1a1aa" : "#71717a",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        horzLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
      },
      crosshair: {
        mode: 0, // normal
        vertLine: {
          color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
          style: 2, // dashed
        },
        horzLine: {
          color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      },
      width: containerRef.current.clientWidth,
      height,
    });

    // K-line (candlestick) series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "hsl(142 60% 42%)",
      downColor: "hsl(0 62% 45%)",
      borderUpColor: "hsl(142 60% 42%)",
      borderDownColor: "hsl(0 62% 45%)",
      wickUpColor: "hsl(142 60% 42%)",
      wickDownColor: "hsl(0 62% 45%)",
    });

    const candleData: CandlestickData[] = data.map((d) => ({
      time: d.date as CandlestickData["time"],
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeries.setData(candleData);

    // Volume series (bottom 25%)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: isDark ? "rgba(161,161,170,0.4)" : "rgba(113,113,122,0.4)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false, // hide volume price labels
    });

    const volumeData: HistogramData[] = data.map((d) => ({
      time: d.date as HistogramData["time"],
      value: d.volume,
      color: d.close >= d.open
        ? "hsla(142, 60%, 42%, 0.5)"
        : "hsla(0, 62%, 45%, 0.5)",
    }));
    volumeSeries.setData(volumeData);

    // Fit all data
    chart.timeScale().fitContent();

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Theme observer
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains("dark");
      chart.applyOptions({
        layout: {
          textColor: dark ? "#a1a1aa" : "#71717a",
        },
        grid: {
          vertLines: { color: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
          horzLines: { color: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        },
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height]);

  if (data.length === 0) return null;

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">K-line</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {data.length} trading days
          </p>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height }}
      />
    </div>
  );
}
