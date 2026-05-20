import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  className?: string;
  height?: number;
}

export function ChartSkeleton({ className, height = 280 }: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-fade-in overflow-hidden rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="space-y-1.5">
          <div className="skeleton h-3.5 w-24 rounded" />
          <div className="skeleton h-2.5 w-16 rounded" />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-9 rounded-md" />
          ))}
        </div>
      </div>
      {/* Chart area skeleton */}
      <div
        className="flex items-end gap-1 px-4 py-8"
        style={{ height }}
      >
        {Array.from({ length: 20 }).map((_, i) => {
          const h = 20 + Math.random() * 80;
          return (
            <div
              key={i}
              className="skeleton flex-1 rounded-sm"
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
