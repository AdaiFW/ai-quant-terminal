"use client";

import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Target, Shield,
  Activity, BarChart4, Gauge, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal-store";

const MetricRow = ({
  label, value, color = "#94A3B8", icon: Icon,
}: {
  label: string; value: string; color?: string; icon?: React.ElementType;
}) => (
  <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
    <span className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-mono">
      {Icon && <Icon className="h-3 w-3" style={{ color }} />}
      {label}
    </span>
    <span className="text-[11px] font-semibold tabular-nums text-[#E5E7EB] font-mono" style={{ color }}>
      {value}
    </span>
  </div>
);

const SignalBadge = ({
  signal,
}: {
  signal: string;
}) => {
  const colors: Record<string, string> = {
    "Strong Buy": "bg-[#00C087]/15 text-[#00C087] border-[#00C087]/30",
    "Buy": "bg-[#00C087]/10 text-[#00C087] border-[#00C087]/20",
    "Neutral": "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20",
    "Sell": "bg-[#FF4D4F]/10 text-[#FF4D4F] border-[#FF4D4F]/20",
    "Strong Sell": "bg-[#FF4D4F]/15 text-[#FF4D4F] border-[#FF4D4F]/30",
  };

  return (
    <span className={cn(
      "rounded-md border px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wide",
      colors[signal] || colors.Neutral,
    )}>
      {signal}
    </span>
  );
};

export function AIQuantPanel() {
  const aiData = useTerminalStore((s) => s.aiData);
  const isAnalyzing = useTerminalStore((s) => s.isAnalyzing);
  const tickerData = useTerminalStore((s) => s.tickerData);
  const activeTicker = useTerminalStore((s) => s.activeTicker);

  if (!activeTicker) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-[#94A3B8]/60 font-mono">
        Select a ticker to begin
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Zap className="h-5 w-5 text-[#3B82F6]" />
        </motion.div>
        <p className="text-[11px] text-[#94A3B8] font-mono animate-pulse">
          AI analyzing {activeTicker}...
        </p>
      </div>
    );
  }

  if (!aiData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full">
        <Target className="h-5 w-5 text-[#94A3B8]/30" />
        <p className="text-[11px] text-[#94A3B8]/60 font-mono text-center">
          Run AI analysis<br />to see quant metrics
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-3 p-3 overflow-y-auto"
    >
      {/* Signal */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#94A3B8] font-mono uppercase tracking-wider">
          AI Signal
        </span>
        <SignalBadge signal={aiData.trendSignal} />
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] text-[#94A3B8] font-mono">Confidence</span>
          <span className="text-[10px] tabular-nums text-[#E5E7EB] font-mono">
            {aiData.confidence}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${aiData.confidence}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              aiData.confidence >= 70 ? "bg-[#00C087]" :
              aiData.confidence >= 40 ? "bg-[#3B82F6]" :
              "bg-[#FF4D4F]",
            )}
          />
        </div>
      </div>

      {/* Quant metrics */}
      <div className="space-y-0">
        <MetricRow label="Support" value={`$${aiData.support.toFixed(2)}`} icon={Shield} color="#00C087" />
        <MetricRow label="Resistance" value={`$${aiData.resistance.toFixed(2)}`} icon={Target} color="#FF4D4F" />
        <MetricRow
          label="Momentum"
          value={`${aiData.momentum >= 0 ? "+" : ""}${aiData.momentum.toFixed(1)}%`}
          icon={aiData.momentum >= 0 ? TrendingUp : TrendingDown}
          color={aiData.momentum >= 0 ? "#00C087" : "#FF4D4F"}
        />
        <MetricRow label="Volume" value={aiData.volumeStrength} icon={BarChart4} color="#94A3B8" />
        <MetricRow
          label="Volatility"
          value={`${aiData.volatility.toFixed(1)}%`}
          icon={Activity}
          color="#FF4D4F"
        />
        <MetricRow label="Risk Score" value={`${aiData.riskScore}/10`} icon={Gauge} color="#E5E7EB" />
        <MetricRow
          label="Sentiment"
          value={aiData.marketSentiment}
          icon={aiData.marketSentiment === "Bullish" ? TrendingUp : TrendingDown}
          color={aiData.marketSentiment === "Bullish" ? "#00C087" : "#FF4D4F"}
        />
      </div>
    </motion.div>
  );
}
