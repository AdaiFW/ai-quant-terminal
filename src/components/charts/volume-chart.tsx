"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ChartContainer } from "./chart-container";
import { getChartColors } from "./chart-theme";
import type { VolumePoint } from "./types";
import type { ChartColors } from "./types";

interface VolumeChartProps {
  data: VolumePoint[];
  priceData?: { date: string; close: number }[];
  className?: string;
  height?: number;
}

export function VolumeChart({
  data,
  priceData,
  className,
  height = 200,
}: VolumeChartProps) {
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
    return data.map((p, i) => {
      const isUp = priceData
        ? i === 0
          ? true
          : p.date >= (priceData[i - 1]?.date ?? "")
        : true;
      return {
        ...p,
        displayDate: formatDateShort(p.date),
        isUp:
          priceData && i > 0
            ? (priceData[i]?.close ?? 0) >= (priceData[i - 1]?.close ?? 0)
            : true,
      };
    });
  }, [data, priceData]);

  if (!colors) return null;

  return (
    <ChartContainer
      title="Volume"
      className={className}
      height={height}
      empty={data.length === 0}
      emptyMessage="Volume data unavailable"
    >
      <BarChart data={chartData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={colors.grid}
          vertical={false}
        />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 10, fill: colors.text }}
          tickLine={false}
          axisLine={{ stroke: colors.grid }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: colors.text }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => {
            if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
            if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
            if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
            return String(v);
          }}
          width={45}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.[0]) return null;
            const val = payload[0].value as number;
            return (
              <div className="animate-scale-in rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="font-semibold tabular-nums text-foreground">
                  Vol: {val.toLocaleString()}
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="volume"
          radius={[2, 2, 0, 0]}
          maxBarSize={32}
          animationDuration={600}
          animationEasing="ease-out"
        >
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isUp ? colors.bullish : colors.bearish}
              fillOpacity={0.65}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
