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
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
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
