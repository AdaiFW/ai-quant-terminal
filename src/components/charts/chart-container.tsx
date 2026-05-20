"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  height?: number;
  empty?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
}

/**
 * Responsive chart wrapper with title, empty state, and theming.
 */
export function ChartContainer({
  title,
  subtitle,
  children,
  className,
  height = 280,
  empty = false,
  emptyMessage = "No data available",
  actions,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Content */}
      <div className="px-1 py-3" style={{ height }}>
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart3 className="h-6 w-6 opacity-50" />
            <p className="text-xs">{emptyMessage}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
