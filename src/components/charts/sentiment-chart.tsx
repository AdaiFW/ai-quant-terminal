"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { ChartContainer } from "./chart-container";
import { ChartTooltip } from "./chart-tooltip";
import { getChartColors } from "./chart-theme";
import type { SentimentPoint } from "./types";
import type { ChartColors } from "./types";

interface SentimentChartProps {
  data: SentimentPoint[];
  className?: string;
  height?: number;
}

/**
 * AI Sentiment History Chart.
 * Shows sentiment score (0–100) over time.
 * - 70+ = Strongly Bullish
 * - 40–70 = Mixed/Neutral
 * - 0–40 = Bearish
 */
export function SentimentChart({
  data,
  className,
  height = 260,
}: SentimentChartProps) {
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

  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        displayDate: formatDate(p.date),
      })),
    [data],
  );

  if (!colors) return null;

  // Gradient: bullish at top, bearish at bottom
  const sentimentGradientId = "sentimentGradient";

  return (
    <ChartContainer
      title="AI Sentiment History"
      subtitle="Sentiment score over time"
      className={className}
      height={height}
      empty={data.length === 0}
      emptyMessage="No sentiment history yet"
    >
      <AreaChart data={chartData}>
        <defs>
          <linearGradient
            id={sentimentGradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={colors.bullish} stopOpacity={0.35} />
            <stop offset="50%" stopColor={colors.bullish} stopOpacity={0.1} />
            <stop offset="100%" stopColor={colors.bearish} stopOpacity={0.25} />
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
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: colors.text }}
          tickLine={false}
          axisLine={false}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}`}
          width={30}
        />
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={(l) => `Date: ${l}`}
              hideItems={["confidence"]}
            />
          }
          cursor={{
            stroke: colors.text,
            strokeDasharray: "4 4",
            strokeWidth: 0.5,
          }}
        />
        {/* Sentiment area */}
        <Area
          type="monotone"
          dataKey="sentiment"
          stroke={colors.primary ?? colors.line}
          strokeWidth={2}
          fill={`url(#${sentimentGradientId})`}
          name="Sentiment"
          dot={false}
          activeDot={{
            r: 4,
            fill: colors.primary ?? colors.line,
            stroke: "hsl(var(--background))",
            strokeWidth: 2,
          }}
          animationDuration={800}
          animationEasing="ease-out"
        />
        {/* Neutral line at 50 */}
        <ReferenceLine
          y={50}
          stroke={colors.text}
          strokeOpacity={0.25}
          strokeDasharray="4 4"
          strokeWidth={0.5}
          label={{
            value: "Neutral",
            position: "insideBottomRight",
            fill: colors.text,
            fontSize: 10,
          }}
        />
        {/* Bullish threshold */}
        <ReferenceLine
          y={70}
          stroke={colors.bullish}
          strokeOpacity={0.2}
          strokeDasharray="2 4"
          strokeWidth={0.5}
        />
        {/* Bearish threshold */}
        <ReferenceLine
          y={30}
          stroke={colors.bearish}
          strokeOpacity={0.2}
          strokeDasharray="2 4"
          strokeWidth={0.5}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
