import { Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIAnalysisOutput, Sentiment } from "@/types/ai-analysis";
import { SentimentBadge } from "./sentiment-badge";
import { RiskIndicator } from "./risk-indicator";
import { ConfidenceGauge } from "./confidence-gauge";

interface AIAnalysisPanelProps {
  data: AIAnalysisOutput;
  meta?: {
    model: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    attempts: number;
  };
  className?: string;
}

export function AIAnalysisPanel({
  data,
  meta,
  className,
}: AIAnalysisPanelProps) {
  return (
    <div
      className={cn(
        "animate-scale-in rounded-xl border bg-card p-6 shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Analysis</h3>
          {meta && (
            <p className="text-[11px] text-muted-foreground">
              {meta.model} &middot;{" "}
              {meta.tokensInput + meta.tokensOutput} tokens &middot;{" "}
              {(meta.latencyMs / 1000).toFixed(1)}s
              {meta.attempts > 1 && (
                <span className="ml-1 text-yellow-500">
                  ({meta.attempts} attempts)
                </span>
              )}
            </p>
          )}
        </div>
        <SentimentBadge
          sentiment={data.sentiment as Sentiment}
          className="ml-auto"
        />
      </div>

      {/* Summary */}
      <p className="mt-4 text-sm leading-relaxed text-foreground/85">
        {data.summary}
      </p>

      {/* Metrics row */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <RiskIndicator level={data.risk_level} />
        <ConfidenceGauge value={data.confidence} />
      </div>

      {/* Key factors */}
      <div className="mt-5 space-y-2.5 border-t pt-4">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <p className="text-xs font-semibold">Key Factors</p>
        </div>
        <ul className="space-y-2">
          {data.key_factors.map((factor, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
            >
              <span className="mt-[3px] flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
              {factor}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
