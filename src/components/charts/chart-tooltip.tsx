/* ═══════════════════════════════════════════
   Custom Chart Tooltip
   ═══════════════════════════════════════════ */

import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  /** Custom label formatter (e.g., format date) */
  labelFormatter?: (label: string) => string;
  /** Items to hide from the tooltip */
  hideItems?: string[];
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  hideItems = [],
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const visible = payload.filter((p) => !hideItems.includes(p.dataKey as string));

  if (visible.length === 0) return null;

  return (
    <div className="animate-scale-in rounded-lg border bg-popover px-3.5 py-2.5 text-xs shadow-lg">
      {label && (
        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      )}
      {visible.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact tooltip for mobile.
 */
export function ChartTooltipCompact({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="animate-scale-in rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          className="font-semibold tabular-nums text-foreground"
          style={{ color: entry.color }}
        >
          {typeof entry.value === "number"
            ? entry.value.toLocaleString()
            : entry.value}
        </p>
      ))}
    </div>
  );
}
