"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Star, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal-store";

export function WatchlistPanel() {
  const watchlist = useTerminalStore((s) => s.watchlist);
  const activeTicker = useTerminalStore((s) => s.activeTicker);
  const setActiveTicker = useTerminalStore((s) => s.setActiveTicker);
  const setLoading = useTerminalStore((s) => s.setLoading);
  const [search, setSearch] = useState("");

  const filtered = search
    ? watchlist.filter((w) => w.toLowerCase().includes(search.toLowerCase()))
    : watchlist;

  const handleSelect = (symbol: string) => {
    setActiveTicker(symbol);
    setLoading(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0E17]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
          Watchlist
        </span>
        <button className="p-0.5 hover:bg-white/[0.06] rounded transition-colors">
          <Plus className="h-3.5 w-3.5 text-[#94A3B8]" />
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-2">
        <div className="flex items-center gap-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] px-2 py-1">
          <Search className="h-3 w-3 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="flex-1 bg-transparent text-[11px] text-[#E5E7EB] placeholder:text-[#94A3B8]/50 outline-none font-mono"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {filtered.map((symbol, i) => (
          <motion.button
            key={symbol}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => handleSelect(symbol)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all",
              activeTicker === symbol
                ? "bg-[#3B82F6]/15 border border-[#3B82F6]/30"
                : "hover:bg-white/[0.04] border border-transparent",
            )}
          >
            <Star
              className={cn(
                "h-3 w-3 shrink-0",
                activeTicker === symbol
                  ? "text-[#3B82F6] fill-[#3B82F6]"
                  : "text-[#94A3B8]/40",
              )}
            />
            <span
              className={cn(
                "text-[12px] font-semibold font-mono tracking-tight",
                activeTicker === symbol
                  ? "text-[#3B82F6]"
                  : "text-[#94A3B8]",
              )}
            >
              {symbol}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
