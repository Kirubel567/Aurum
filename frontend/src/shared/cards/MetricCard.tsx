import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type Trend = "up" | "down" | "neutral";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: Trend;
  compact?: boolean;
  className?: string;
}

const trendConfig: Record<
  Trend,
  { icon: React.ReactNode; className: string }
> = {
  up: {
    icon: <TrendingUp className="size-3" />,
    className: "status-chip-positive",
  },
  down: {
    icon: <TrendingDown className="size-3" />,
    className: "status-chip-negative",
  },
  neutral: {
    icon: <Minus className="size-3" />,
    className: "bg-[#F1F5F9] text-muted-foreground",
  },
};

export function MetricCard({
  label,
  value,
  delta,
  trend = "neutral",
  compact = true,
  className,
}: MetricCardProps) {
  const trendStyle = trendConfig[trend];

  return (
    <div
      className={cn(
        "rounded-lg border border-[#E2E8F0] bg-white transition-normal",
        compact ? "p-3" : "p-5",
        className
      )}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-semibold text-[#0C1017]",
          compact ? "text-lg" : "text-2xl"
        )}
      >
        {value}
      </p>
      {delta && (
        <div
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
            trendStyle.className
          )}
        >
          {trendStyle.icon}
          {delta}
        </div>
      )}
    </div>
  );
}
