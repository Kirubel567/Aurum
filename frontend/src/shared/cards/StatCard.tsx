import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";

type Trend = "up" | "down" | "neutral";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: Trend;
  icon?: React.ReactNode;
  className?: string;
}

const trendConfig: Record<
  Trend,
  { icon: React.ReactNode; className: string }
> = {
  up: {
    icon: <TrendingUp className="size-3.5" />,
    className: "status-chip-positive",
  },
  down: {
    icon: <TrendingDown className="size-3.5" />,
    className: "status-chip-negative",
  },
  neutral: {
    icon: <Minus className="size-3.5" />,
    className: "bg-white/[0.06] text-muted-foreground",
  },
};

export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  icon,
  className,
}: StatCardProps) {
  const trendStyle = trendConfig[trend];

  return (
    <GlassCard className={className} padding="md">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && (
          <div className="text-[#D4AF37] opacity-80">{icon}</div>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {delta && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            trendStyle.className
          )}
        >
          {trendStyle.icon}
          {delta}
        </div>
      )}
    </GlassCard>
  );
}
