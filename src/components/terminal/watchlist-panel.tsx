"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal-store";

function isCN(s: string) { return /^\d{6}$/.test(s); }

export function WatchlistPanel() {
  const watchlist = useTerminalStore((s) => s.watchlist);
  const activeTicker = useTerminalStore((s) => s.activeTicker);
  const setActiveTicker = useTerminalStore((s) => s.setActiveTicker);
  const setLoading = useTerminalStore((s) => s.setLoading);
  const [search, setSearch] = useState("");

  const { us, cnStocks } = useMemo(() => {
    const filtered = search
      ? watchlist.filter((w) => w.toLowerCase().includes(search.toLowerCase()))
      : watchlist;
    return {
      us: filtered.filter((s) => !isCN(s)),
      cnStocks: filtered.filter((s) => isCN(s)),
    };
  }, [watchlist, search]);

  const handleSelect = (symbol: string) => {
    setActiveTicker(symbol);
    setLoading(true);
  };

  const Item = ({ symbol }: { symbol: string }) => (
    <button
      onClick={() => handleSelect(symbol)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-all font-mono text-[11px]",
        activeTicker === symbol
          ? "bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] font-semibold"
          : "hover:bg-white/[0.04] border border-transparent text-[#94A3B8]",
      )}
    >
      {symbol}
    </button>
  );

  const Section = ({ title, count, items }: { title: string; count: number; items: string[] }) => (
    <div>
      <div className="flex items-center justify-between px-2 py-1.5 text-[9px] font-semibold text-[#94A3B8]/60 uppercase tracking-widest">
        <span>{title}</span>
        <span className="tabular-nums">{count}</span>
      </div>
      <div className="space-y-0.5">
        {items.map((s) => <Item key={s} symbol={s} />)}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0A0E17]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Watchlist</span>
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
            placeholder="Filter tickers..."
            className="flex-1 bg-transparent text-[11px] text-[#E5E7EB] placeholder:text-[#94A3B8]/50 outline-none font-mono"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-1">
        <Section title="US Stocks" count={us.length} items={us} />
        <div className="mx-2 border-t border-white/[0.04]" />
        <Section title="China A-Shares" count={cnStocks.length} items={cnStocks} />
      </div>
    </div>
  );
}
