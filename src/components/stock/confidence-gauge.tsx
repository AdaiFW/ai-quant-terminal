"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
  value: number; // 0-100
  className?: string;
}

export function ConfidenceGauge({ value, className }: ConfidenceGaugeProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const clamped = Math.max(0, Math.min(100, value));
  const color =
    clamped >= 70
      ? "bg-bullish"
      : clamped >= 40
        ? "bg-yellow-500"
        : "bg-bearish";

  const label =
    clamped >= 70 ? "High" : clamped >= 40 ? "Moderate" : "Low";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Confidence
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {clamped}%
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            color,
          )}
          style={{ width: animated ? `${clamped}%` : "0%" }}
        />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <p
        className={cn(
          "text-[11px] font-medium",
          clamped >= 70
            ? "text-bullish"
            : clamped >= 40
              ? "text-yellow-500"
              : "text-bearish",
        )}
      >
        {label} confidence
      </p>
    </div>
  );
}
