"use client";

import { useTerminalStore } from "@/stores/terminal-store";

export function StatusBar() {
  const activeTicker = useTerminalStore((s) => s.activeTicker);
  const tickerData = useTerminalStore((s) => s.tickerData);

  return (
    <div className="flex items-center justify-between h-6 px-3 border-t border-white/[0.06] bg-[#0A0E17] text-[10px] font-mono text-[#94A3B8]">
      <div className="flex items-center gap-4">
        <span>{activeTicker ? `Market: ${tickerData?.exchange || activeTicker}` : "AI Quant Terminal"}</span>
        <span className="text-[#00C087]">● Connected</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Data: Finnhub + Eastmoney</span>
        <span>AI: DeepSeek</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
