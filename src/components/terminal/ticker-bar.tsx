"use client";

import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal-store";

export function TickerBar() {
  const tickers = useTerminalStore((s) => s.tickerBar);

  return (
    <div className="flex h-8 items-center border-b border-white/[0.06] bg-[#0A0E17] overflow-hidden group">
      <div className="flex animate-scroll-x gap-0 group-hover:[animation-play-state:paused]">
        {[...tickers, ...tickers].map((t, i) => (
          <div
            key={`${t.symbol}-${i}`}
            className="flex shrink-0 items-center gap-2 px-4 h-8 border-r border-white/[0.04]"
          >
            <span className="text-[11px] font-semibold text-[#E5E7EB] font-mono tracking-tight">
              {t.symbol}
            </span>
            <span className="text-[11px] tabular-nums text-[#94A3B8] font-mono">
              {t.currency === "CNY" ? "¥" : "$"}{t.price.toLocaleString()}
            </span>
            <span
              className={cn(
                "text-[10px] tabular-nums font-mono",
                t.change >= 0 ? "text-[#00C087]" : "text-[#FF4D4F]",
              )}
            >
              {t.change >= 0 ? "+" : ""}{t.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
