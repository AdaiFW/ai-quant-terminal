import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/ai-analysis";

interface RiskIndicatorProps {
  level: RiskLevel;
  className?: string;
}

const config: Record<
  RiskLevel,
  { icon: typeof Shield; label: string; barWidth: string; barColor: string }
> = {
  Low: {
    icon: ShieldCheck,
    label: "Low Risk",
    barWidth: "w-1/4",
    barColor: "bg-bullish",
  },
  Medium: {
    icon: Shield,
    label: "Medium Risk",
    barWidth: "w-2/4",
    barColor: "bg-yellow-500",
  },
  High: {
    icon: ShieldAlert,
    label: "High Risk",
    barWidth: "w-full",
    barColor: "bg-bearish",
  },
};

export function RiskIndicator({ level, className }: RiskIndicatorProps) {
  const { icon: Icon, label, barWidth, barColor } = config[level];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground">Risk</span>
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barWidth,
            barColor,
          )}
        />
      </div>
    </div>
  );
}
