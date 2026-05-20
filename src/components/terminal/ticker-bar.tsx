"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal-store";
import { TICKER_MAP } from "@/stores/terminal-store";

export function TickerBar() {
  const tickers = useTerminalStore((s) => s.tickerBar);
  const setActiveTicker = useTerminalStore((s) => s.setActiveTicker);

  const handleClick = (symbol: string) => {
    // Resolve display name to actual ticker
    const ticker = TICKER_MAP[symbol] || symbol;
    setActiveTicker(ticker);
  };

  return (
    <div className="flex h-8 items-center border-b border-white/[0.06] bg-[#0A0E17] overflow-hidden">
      <div className="flex animate-scroll-x gap-0">
        {[...tickers, ...tickers].map((t, i) => (
          <button
            key={`${t.symbol}-${i}`}
            onClick={() => handleClick(t.symbol)}
            className="flex shrink-0 items-center gap-2 px-4 h-8 hover:bg-white/[0.04] transition-colors cursor-pointer border-r border-white/[0.04]"
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
          </button>
        ))}
      </div>
    </div>
  );
}
