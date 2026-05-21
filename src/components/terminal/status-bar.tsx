"use client";

import { useEffect, useState } from "react";
import { useTerminalStore } from "@/stores/terminal-store";

export function StatusBar() {
  const activeTicker = useTerminalStore((s) => s.activeTicker);
  const tickerData = useTerminalStore((s) => s.tickerData);
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between h-6 px-3 border-t border-white/[0.06] bg-[#0A0E17] text-[10px] font-mono text-[#94A3B8]">
      <div className="flex items-center gap-4">
        <span>{activeTicker ? `Market: ${tickerData?.exchange || activeTicker}` : "AI Quant Terminal"}</span>
        <span className="text-[#00C087]">● Connected</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Data: Finnhub + Eastmoney</span>
        <span>AI: DeepSeek</span>
        <span className="tabular-nums">{time}</span>
      </div>
    </div>
  );
}
