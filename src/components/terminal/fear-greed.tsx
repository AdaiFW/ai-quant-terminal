"use client";

import { motion } from "framer-motion";

export function FearGreedIndex() {
  // Simulated — real data would come from alternative.me API
  const value = 62;
  const label = "Greed";
  const segments = [
    { label: "Extreme Fear", range: [0, 25], color: "#FF4D4F" },
    { label: "Fear", range: [25, 45], color: "#F59E0B" },
    { label: "Neutral", range: [45, 55], color: "#94A3B8" },
    { label: "Greed", range: [55, 75], color: "#00C087" },
    { label: "Extreme Greed", range: [75, 100], color: "#00C087" },
  ];

  const current = segments.find((s) => value >= s.range[0]! && value < s.range[1]!)!;

  return (
    <div className="px-3 py-3 border-b border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider font-mono">
          Fear & Greed
        </span>
        <span className="text-[10px] tabular-nums font-mono" style={{ color: current.color }}>
          {value}
        </span>
      </div>

      {/* Scale bar */}
      <div className="h-2 flex rounded-full overflow-hidden bg-white/[0.05]">
        <div className="h-full" style={{ width: "25%", backgroundColor: "#FF4D4F" }} />
        <div className="h-full" style={{ width: "20%", backgroundColor: "#F59E0B" }} />
        <div className="h-full" style={{ width: "10%", backgroundColor: "#94A3B8" }} />
        <div className="h-full" style={{ width: "20%", backgroundColor: "#00C087" }} />
        <div className="h-full" style={{ width: "25%", backgroundColor: "#00C087" }} />
      </div>

      {/* Indicator */}
      <motion.div
        className="relative mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div
          className="absolute w-0.5 h-2 bg-white rounded"
          style={{ left: `${value}%`, top: "-6px" }}
        />
      </motion.div>

      <p className="mt-2 text-[10px] font-mono text-right" style={{ color: current.color }}>
        {label}
      </p>
    </div>
  );
}
