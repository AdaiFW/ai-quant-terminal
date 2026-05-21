"use client";

import { TrendingUp, TrendingDown, Flame } from "lucide-react";

const TRENDING = [
  { ticker: "NVDA", change: 4.2, volume: "52M" },
  { ticker: "TSLA", change: -2.1, volume: "38M" },
  { ticker: "600519", change: -0.7, volume: "4.7M" },
  { ticker: "002594", change: 1.6, volume: "28M" },
  { ticker: "SMCI", change: 8.3, volume: "15M" },
  { ticker: "PLTR", change: 3.7, volume: "22M" },
];

export function TrendingStocks() {
  return (
    <div className="px-3 py-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-1.5 mb-2">
        <Flame className="h-3 w-3 text-[#F59E0B]" />
        <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider font-mono">
          Trending
        </span>
      </div>
      <div className="space-y-0.5">
        {TRENDING.map((s) => (
          <div key={s.ticker} className="flex items-center justify-between py-0.5">
            <span className="text-[11px] text-[#E5E7EB] font-mono">{s.ticker}</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#94A3B8] font-mono tabular-nums">{s.volume}</span>
              <span className={`text-[10px] font-mono tabular-nums flex items-center gap-0.5 ${
                s.change >= 0 ? "text-[#00C087]" : "text-[#FF4D4F]"
              }`}>
                {s.change >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {s.change >= 0 ? "+" : ""}{s.change}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
