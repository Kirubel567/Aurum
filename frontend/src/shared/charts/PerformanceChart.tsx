"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { STATUS_COLORS } from "@/src/lib/constants/theme";
import type { EquityDrawdownPoint } from "@/src/types/dashboard.types";
import { cn } from "@/lib/utils";

interface PerformanceChartProps {
  data: EquityDrawdownPoint[];
  className?: string;
  height?: number;
}

// Recharts' contentStyle only takes inline styles, which can't follow the
// .dark class — this custom tooltip uses Tailwind classes instead so it
// theme-switches like everything else.
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#0d141d] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
      <p className="mb-1 font-bold text-slate-700 dark:text-white">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-1.5 text-slate-600 dark:text-white/70">
          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.name}:{" "}
          <span className="font-semibold text-slate-800 dark:text-white">
            {typeof item.value === "number"
              ? item.value.toLocaleString("en-US", { style: "currency", currency: "USD" })
              : item.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function PerformanceChart({
  data,
  className,
  height = 256,
}: PerformanceChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STATUS_COLORS.positive} stopOpacity={0.2} />
              <stop offset="100%" stopColor={STATUS_COLORS.positive} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STATUS_COLORS.negative} stopOpacity={0.2} />
              <stop offset="100%" stopColor={STATUS_COLORS.negative} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="currentColor"
            strokeOpacity={0.5}
            vertical={false}
            className="text-gray-100 dark:text-white/10"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#94a3b8", strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={STATUS_COLORS.positive}
            strokeWidth={2}
            fill="url(#equityFill)"
            name="Total fund equity"
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke={STATUS_COLORS.negative}
            strokeWidth={2}
            fill="url(#drawdownFill)"
            name="Max Drawdown"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
