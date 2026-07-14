"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatUSD } from "@/src/lib/formatters/currency";
import { ROUTES } from "@/src/lib/constants/routes";
import type {
  DashboardSummary,
  DashboardTrading,
  EquityCurve,
} from "@/src/features/dashboard/hooks/useDashboardData";
import { cn } from "@/lib/utils";

const PERIOD_LABELS: Record<string, { label: string; gainLossLabel: string }> = {
  day: { label: "Today", gainLossLabel: "Daily Gain/Loss" },
  week: { label: "This Week", gainLossLabel: "Weekly Gain/Loss" },
  month: { label: "This Month", gainLossLabel: "Monthly Gain/Loss" },
  year: { label: "This Year", gainLossLabel: "Annual Gain/Loss" },
};

interface MetricsRowProps {
  period: string;
  summary: DashboardSummary; // real (Phase 1)
  curve: EquityCurve | null; // real (Phase 1)
  trading: DashboardTrading | null; // real (Phase 2)
}

// Sparkline of the realized (closed) balance. Green while the balance is at
// or above where the period started, red when it's below — a drawdown from
// the period baseline is immediately visible by color alone.
function Sparkline({ points, positive }: { points: { value: number }[]; positive: boolean }) {
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 200;
      const y = 80 - ((p.value - min) / range) * 60;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const area = `${path} V80 H0 Z`;
  const color = positive ? "#10b981" : "#ef4444";
  const glow = positive ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)";

  return (
    <svg className="mb-6 h-24 w-full" preserveAspectRatio="none" viewBox="0 0 200 80">
      <defs>
        <linearGradient id="sparklineFillUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="sparklineFillDown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={positive ? "url(#sparklineFillUp)" : "url(#sparklineFillDown)"} />
      <path d={path} fill="none" stroke={color} strokeWidth={3} style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    </svg>
  );
}

function DonutChart({
  segments,
}: {
  segments: DashboardTrading["allocation"];
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  // Each segment's start offset = sum of the segments before it (n is tiny,
  // so the quadratic prefix sum is fine and keeps the render pure).
  const arcs = segments.map((segment, i) => ({
    segment,
    dash: (segment.percent / 100) * circumference,
    offset: segments
      .slice(0, i)
      .reduce((sum, s) => sum + (s.percent / 100) * circumference, 0),
  }));

  return (
    <div className="relative flex size-24 items-center justify-center">
      <svg className="size-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" className="stroke-gray-200 dark:stroke-white/10" strokeWidth="12" />
        {arcs.map(({ segment, dash, offset }) => (
          <circle
            key={segment.name}
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="12"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>
    </div>
  );
}

export function MetricsRow({ period, summary, curve, trading }: MetricsRowProps) {
  const labels = PERIOD_LABELS[period] ?? PERIOD_LABELS.day;
  const strategyAllocation = trading?.allocation ?? [];

  // Real numbers (Phase 1).
  const points = curve?.points ?? [];
  const changePercent = curve?.changePercent ?? 0;
  const gainLoss =
    points.length > 0 ? points[points.length - 1].equity - points[0].equity : 0;
  const positive = gainLoss >= 0;
  const sparkline =
    points.length > 1
      ? points.map((p) => ({ value: p.equity }))
      : [{ value: 0 }, { value: 0 }];

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">

      {/* ── Card 1: Fund Performance ── always dark bg per stitch */}
      <div className="relative overflow-hidden rounded-2xl bg-[#050b14] p-6 text-white border border-white/5 dark:border-[#c4a24d]/30">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Link
              href={ROUTES.ORDERS}
              className="mb-1 flex items-center gap-1.5 text-sm font-medium text-white/40 hover:text-white transition-colors"
            >
              Fund Performance
              <ExternalLink className="size-3 flex-shrink-0" />
            </Link>
            <div className={cn("text-2xl font-bold", changePercent >= 0 ? "text-[#c4a24d]" : "text-red-400")}>
              {changePercent >= 0 ? "+" : ""}
              {changePercent}%{" "}
              <span className="text-xs font-medium opacity-50">{labels.label}</span>
            </div>
          </div>
          <Link
            href={ROUTES.ORDERS}
            className="rounded border border-[#c4a24d]/30 bg-[#c4a24d]/20 px-2 py-1 text-[10px] font-bold text-[#c4a24d] hover:bg-[#c4a24d]/30 transition-colors"
          >
            Live Performance
          </Link>
        </div>
        <Sparkline points={sparkline} positive={positive} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-[10px] font-bold text-white/40 uppercase">
              Profit (MTD)
            </div>
            <div className="text-xl font-extrabold">{formatUSD(summary.monthToDateProfit)}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold text-white/40 uppercase">
              {labels.label} Return
            </div>
            <div className="text-xl font-extrabold">{formatUSD(gainLoss)}</div>
          </div>
        </div>
      </div>

      {/* ── Card 2: Account Overview ── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
        <h3 className="mb-6 text-sm font-bold text-gray-900 dark:text-white">Account Overview</h3>
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
            Available for Trading
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {formatUSD(summary.availableForTrading)}
          </div>
        </div>
        <div className="mb-6 rounded-r-lg border-l-4 border-[#C5A059] bg-[#C5A059]/10 p-3 dark:bg-[#c4a24d]/10">
          <div className="text-[10px] font-extrabold text-[#C5A059] dark:text-[#c4a24d] uppercase">
            Open Positions
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {trading?.openPositionsCount ?? 0}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
            {labels.gainLossLabel}
          </div>
          <div className={cn("text-xl font-bold", positive ? "text-[#10b981]" : "text-red-500")}>
            {positive ? "+" : ""}{formatUSD(gainLoss)}
          </div>
        </div>
      </div>

      {/* ── Card 3: Trade Category Breakdown ── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
        <h3 className="mb-6 text-sm font-bold text-gray-900 dark:text-white">Trade Category Breakdown</h3>
        <div className="flex flex-col items-center gap-6">
          {strategyAllocation.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400 dark:text-white/40">
              Category breakdown appears once your first trade is taken.
            </p>
          ) : (
            <>
              <DonutChart segments={strategyAllocation} />
              <div className="w-full space-y-3">
                <div className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider">
                  % of Trades Taken
                </div>
                {strategyAllocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-gray-600 dark:text-white/80">
                      <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardInfoBanner({
  allocatedBalance,
}: {
  allocatedBalance: number;
}) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center dark:bg-[#c4a24d]/10 dark:border-[#c4a24d]/20">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 dark:bg-[#c4a24d] text-xs font-bold text-white dark:text-[#050b14]">
          i
        </div>
        <p className="text-sm text-blue-900 dark:text-white/80">
          Your allocated wallet balance of{" "}
          <span className="font-bold dark:text-[#c4a24d]">{formatUSD(allocatedBalance)}</span> is NOT
          used for trading. It is for withdrawals and personal use only.
        </p>
      </div>
      <Link
        href={ROUTES.WALLET}
        className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20"
      >
        View Wallet
      </Link>
    </div>
  );
}

export function PeriodSelector({
  active,
  onChange,
}: {
  active: string;
  onChange: (period: string) => void;
}) {
  const periods = ["Day", "Week", "Month", "Year"];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
      <span className="font-medium text-gray-500 dark:text-white/40">Performance Period:</span>
      <div className="flex gap-1 rounded-lg border border-gray-100 bg-white p-1 dark:bg-white/5 dark:border-white/10">
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period.toLowerCase())}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
              active === period.toLowerCase()
                ? "bg-[#C5A059]/10 font-bold text-[#C5A059] dark:bg-[#c4a24d] dark:text-[#050b14]"
                : "text-gray-400 hover:bg-gray-50 dark:text-white/40 dark:hover:bg-white/5"
            )}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  );
}
