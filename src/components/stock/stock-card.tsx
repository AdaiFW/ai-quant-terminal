import { Building2, DollarSign, BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockQuote } from "@/types/stock";

interface StockCardProps {
  data: StockQuote;
  className?: string;
}

function currencySymbol(currency: string): string {
  if (currency === "CNY") return "¥";
  return "$";
}

export function StockCard({ data, className }: StockCardProps) {
  const isPositive = data.dailyChange >= 0;
  const symbol = currencySymbol(data.currency);

  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight">
              {data.ticker}
            </h3>
            {data.exchange && (
              <span className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {data.exchange.split(" ")[0]}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.currency}
          </p>
        </div>

        {/* Price & change */}
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {symbol}{data.currentPrice.toFixed(2)}
          </p>
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
              isPositive
                ? "bg-bullish/10 text-bullish"
                : "bg-bearish/10 text-bearish",
            )}
          >
            <span>{isPositive ? "+" : ""}{data.dailyChange.toFixed(2)}</span>
            <span className="opacity-80">
              ({isPositive ? "+" : ""}{data.dailyChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
        <StatItem
          icon={BarChart3}
          label="Open"
          value={`$${data.open.toFixed(2)}`}
        />
        <StatItem
          icon={Activity}
          label="High"
          value={`$${data.high.toFixed(2)}`}
          className="text-bullish"
        />
        <StatItem
          icon={Activity}
          label="Low"
          value={`$${data.low.toFixed(2)}`}
          className="text-bearish"
        />
        <StatItem
          icon={BarChart3}
          label="Volume"
          value={formatVolume(data.volume)}
        />
        {data.marketCap != null && (
          <StatItem
            icon={Building2}
            label="Market Cap"
            value={formatMarketCap(data.marketCap)}
          />
        )}
        {data.movingAverage50Day != null && (
          <StatItem
            icon={DollarSign}
            label="50-Day MA"
            value={`$${data.movingAverage50Day.toFixed(2)}`}
          />
        )}
        <StatItem
          icon={DollarSign}
          label="Prev Close"
          value={`$${data.previousClose.toFixed(2)}`}
        />
        <StatItem
          icon={Activity}
          label="Updated"
          value={formatTime(data.timestamp)}
        />
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", className)}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={cn("truncate text-xs font-medium", className)}>
          {value}
        </p>
      </div>
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

function formatMarketCap(mc: number): string {
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`;
  return `$${mc.toLocaleString()}`;
}

function formatTime(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
