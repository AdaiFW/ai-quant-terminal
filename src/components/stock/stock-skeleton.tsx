import { cn } from "@/lib/utils";

export function StockCardSkeleton() {
  return (
    <div className="animate-fade-in rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-7 w-32" />
        </div>
        <div className="skeleton h-10 w-24 rounded-lg" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalysisPanelSkeleton() {
  return (
    <div className="animate-fade-in space-y-4 rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-5 rounded-full" />
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-4/6" />
      </div>
      <div className="flex gap-4">
        <div className="skeleton h-20 w-24 rounded-lg" />
        <div className="skeleton h-20 w-24 rounded-lg" />
        <div className="skeleton h-20 w-24 rounded-lg" />
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="skeleton h-2 w-2 rounded-full" />
            <div className="skeleton h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="skeleton h-10 w-32 rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <StockCardSkeleton />
        <AnalysisPanelSkeleton />
      </div>
    </div>
  );
}

export function ConfidenceBarSkeleton() {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-8" />
      </div>
      <div className="skeleton h-2 w-full rounded-full" />
    </div>
  );
}
