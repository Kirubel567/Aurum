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

import type { EquityDrawdownPoint } from "@/src/types/dashboard.types";
import { cn } from "@/lib/utils";

// Standard fund-dashboard layout: the equity curve on top, and an
// "underwater plot" beneath it — a red area hanging down from 0 showing the
// percent below the running high-water mark. Flat at 0 = at the peak;
// dips = drawdown periods. (This is how quantstats/propfirm dashboards
// render drawdown; the old version drew the running peak as a second line
// on the same axis, which buried the equity curve and read as "broken".)

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
  percent = false,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  percent?: boolean;
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
              ? percent
                ? `${item.value.toFixed(2)}%`
                : item.value.toLocaleString("en-US", { style: "currency", currency: "USD" })
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
  const equityHeight = Math.round(height * 0.68);
  const drawdownHeight = height - equityHeight;

  return (
    <div className={cn("w-full", className)}>
      {/* ── Equity curve ── */}
      <div style={{ height: equityHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} syncId="fund-equity">
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4a24d" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#c4a24d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="currentColor"
              strokeOpacity={0.5}
              vertical={false}
              className="text-gray-100 dark:text-white/10"
            />
            <XAxis dataKey="date" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#94a3b8", strokeOpacity: 0.3 }} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#c4a24d"
              strokeWidth={2}
              fill="url(#equityFill)"
              name="Total fund equity"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Underwater drawdown ── */}
      <div style={{ height: drawdownHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 8, left: 0, bottom: 0 }} syncId="fund-equity">
            <defs>
              <linearGradient id="underwaterFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            {/* 0 pinned to the top: the red area hangs downward */}
            <YAxis hide domain={[(dataMin: number) => Math.min(dataMin, -0.5), 0]} />
            <Tooltip content={<ChartTooltip percent />} cursor={{ stroke: "#94a3b8", strokeOpacity: 0.3 }} />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#underwaterFill)"
              baseValue={0}
              name="Drawdown"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
