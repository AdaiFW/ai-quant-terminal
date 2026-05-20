"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line,
} from "recharts";
import { ChartContainer } from "./chart-container";
import { ChartTooltip } from "./chart-tooltip";
import { getChartColors } from "./chart-theme";
import type { PricePoint } from "./types";
import type { ChartColors } from "./types";

interface PriceChartProps {
  data: PricePoint[];
  ma50?: { date: string; value: number }[];
  className?: string;
  height?: number;
  timeframe?: string;
  onChangeTimeframe?: (tf: string) => void;
}

type ChartStyle = "area" | "candle";

export function PriceChart({
  data,
  ma50,
  className,
  height = 320,
  timeframe,
  onChangeTimeframe,
}: PriceChartProps) {
  const [colors, setColors] = useState<ChartColors | null>(null);

  useEffect(() => {
    setColors(getChartColors());
    const observer = new MutationObserver(() => setColors(getChartColors()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    return data.map((p, i) => ({
      ...p,
      displayDate: formatDate(p.date),
      ma50: ma50?.[i]?.value ?? undefined,
    }));
  }, [data, ma50]);

  const isUp = useMemo(() => {
    if (data.length < 2) return true;
    return data[data.length - 1]!.close >= data[0]!.close;
  }, [data]);

  if (!colors) return null;

  const priceColor = isUp ? colors.bullish : colors.bearish;
  const areaColor = isUp
    ? "hsla(142, 60%, 42%, 0.18)"
    : "hsla(0, 62%, 45%, 0.18)";

  const timeframes = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

  return (
    <ChartContainer
      title="Price"
      subtitle={timeframe ? `Past ${timeframe}` : undefined}
      className={className}
      height={height}
      empty={data.length === 0}
      emptyMessage="Price data unavailable"
      actions={
        onChangeTimeframe
          ? timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={
                  timeframe === tf
                    ? "rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground"
                    : "rounded-md px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                {tf}
              </button>
            ))
          : undefined
      }
    >
      <ComposedChart data={chartData}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={priceColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={priceColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={colors.grid}
          vertical={false}
        />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 11, fill: colors.text }}
          tickLine={false}
          axisLine={{ stroke: colors.grid }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 11, fill: colors.text }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          width={55}
        />
        <Tooltip
          content={<ChartTooltip labelFormatter={(l) => `Date: ${l}`} />}
          cursor={{ stroke: colors.text, strokeDasharray: "4 4", strokeWidth: 0.5 }}
        />
        {/* Close price area */}
        <Area
          type="monotone"
          dataKey="close"
          stroke={priceColor}
          strokeWidth={2}
          fill="url(#priceGradient)"
          name="Price"
          dot={false}
          activeDot={{
            r: 4,
            fill: priceColor,
            stroke: "hsl(var(--background))",
            strokeWidth: 2,
          }}
          animationDuration={800}
          animationEasing="ease-out"
        />
        {/* 50-day MA */}
        {ma50 && ma50.length > 0 && (
          <Line
            type="monotone"
            dataKey="ma50"
            stroke={colors.text}
            strokeWidth={1}
            strokeDasharray="6 3"
            name="MA 50"
            dot={false}
            activeDot={false}
            animationDuration={800}
          />
        )}
        {/* Reference line at first price */}
        {data.length > 0 && (
          <ReferenceLine
            y={data[0]!.close}
            stroke={colors.text}
            strokeOpacity={0.3}
            strokeDasharray="3 3"
            strokeWidth={0.5}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
