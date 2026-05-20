import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sentiment } from "@/types/ai-analysis";

interface SentimentBadgeProps {
  sentiment: Sentiment;
  className?: string;
}

const config: Record<
  Sentiment,
  { icon: typeof TrendingUp; label: string; colors: string }
> = {
  Bullish: {
    icon: TrendingUp,
    label: "Bullish",
    colors:
      "border-bullish/30 bg-bullish/10 text-bullish",
  },
  Neutral: {
    icon: Minus,
    label: "Neutral",
    colors:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
  },
  Bearish: {
    icon: TrendingDown,
    label: "Bearish",
    colors:
      "border-bearish/30 bg-bearish/10 text-bearish",
  },
};

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  const { icon: Icon, label, colors } = config[sentiment];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium",
        colors,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-xs">{label}</span>
    </div>
  );
}
