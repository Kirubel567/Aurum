"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatUSD } from "@/src/lib/formatters/currency";
import { ROUTES } from "@/src/lib/constants/routes";
import type { DashboardMetrics } from "@/src/types/dashboard.types";
import { cn } from "@/lib/utils";

// ── Per-period mock overrides ─────────────────────────────────────────────────
// These delta values make the period selector feel live without a real API.
const PERIOD_DATA: Record<
  string,
  {
    label: string;
    ytdPercent: number;
    totalProfit: number;
    netReturn: number;
    gainLossLabel: string;
    gainLoss: number;
    positive: boolean;
    sparkline: { value: number }[];
  }
> = {
  day: {
    label: "Today",
    ytdPercent: 23.5,
    totalProfit: 2840,
    netReturn: 2240,
    gainLossLabel: "Daily Gain/Loss",
    gainLoss: 45.2,
    positive: true,
    sparkline: [
      { value: 60 }, { value: 55 }, { value: 40 },
      { value: 30 }, { value: 45 }, { value: 20 }, { value: 10 },
    ],
  },
  week: {
    label: "This Week",
    ytdPercent: 5.8,
    totalProfit: 680,
    netReturn: 520,
    gainLossLabel: "Weekly Gain/Loss",
    gainLoss: 218.4,
    positive: true,
    sparkline: [
      { value: 20 }, { value: 35 }, { value: 30 },
      { value: 50 }, { value: 45 }, { value: 60 }, { value: 55 },
    ],
  },
  month: {
    label: "This Month",
    ytdPercent: 11.2,
    totalProfit: 1340,
    netReturn: 1090,
    gainLossLabel: "Monthly Gain/Loss",
    gainLoss: 892.0,
    positive: true,
    sparkline: [
      { value: 10 }, { value: 25 }, { value: 45 },
      { value: 35 }, { value: 60 }, { value: 55 }, { value: 70 },
    ],
  },
  year: {
    label: "This Year",
    ytdPercent: 23.5,
    totalProfit: 2840,
    netReturn: 2240,
    gainLossLabel: "Annual Gain/Loss",
    gainLoss: 2240,
    positive: true,
    sparkline: [
      { value: 5 }, { value: 20 }, { value: 15 },
      { value: 40 }, { value: 55 }, { value: 45 }, { value: 65 },
    ],
  },
};

interface MetricsRowProps {
  metrics: DashboardMetrics;
  period: string;
}

function Sparkline({ points }: { points: { value: number }[] }) {
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

  return (
    <svg className="mb-6 h-24 w-full" preserveAspectRatio="none" viewBox="0 0 200 80">
      <defs>
        <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparklineFill)" />
      <path d={path} fill="none" stroke="#10b981" strokeWidth={3} />
    </svg>
  );
}

function DonutChart({
  segments,
}: {
  segments: DashboardMetrics["strategyAllocation"];
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative flex size-24 items-center justify-center">
      <svg className="size-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        {segments.map((segment) => {
          const dash = (segment.percent / 100) * circumference;
          const circle = (
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
          );
          offset += dash;
          return circle;
        })}
      </svg>
    </div>
  );
}

export function MetricsRow({ metrics, period }: MetricsRowProps) {
  const { accountOverview, strategyAllocation } = metrics;
  const pd = PERIOD_DATA[period] ?? PERIOD_DATA.day;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">

      {/* ── Card 1: Fund Performance ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#050b14] p-6 text-white">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Link
              href={ROUTES.ORDERS}
              className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Fund Performance
              <ExternalLink className="size-3 flex-shrink-0" />
            </Link>
            <div className="text-2xl font-bold text-[#10b981]">
              +{pd.ytdPercent}%{" "}
              <span className="text-xs font-medium opacity-70">{pd.label}</span>
            </div>
          </div>
          <Link
            href={ROUTES.ORDERS}
            className="rounded border border-[#10b981]/30 bg-[#10b981]/20 px-2 py-1 text-[10px] font-bold text-[#10b981] hover:bg-[#10b981]/30 transition-colors"
          >
            Live Performance
          </Link>
        </div>
        <Sparkline points={pd.sparkline} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-[10px] font-bold text-gray-500 uppercase">
              Total Profit
            </div>
            <div className="text-xl font-extrabold">{formatUSD(pd.totalProfit)}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold text-gray-500 uppercase">
              Net Return
            </div>
            <div className="text-xl font-extrabold">{formatUSD(pd.netReturn)}</div>
          </div>
        </div>
      </div>

      {/* ── Card 2: Account Overview ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <h3 className="mb-6 text-sm font-bold text-gray-900">Account Overview</h3>
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold text-gray-400 uppercase">
            Available for Trading
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {formatUSD(accountOverview.availableForTrading)}
          </div>
        </div>
        <div className="mb-6 rounded-r-lg border-l-4 border-[#C5A059] bg-[#C5A059]/10 p-3">
          <div className="text-[10px] font-extrabold text-[#C5A059] uppercase">
            Open Positions
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatUSD(accountOverview.openPositions)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold text-gray-400 uppercase">
            {pd.gainLossLabel}
          </div>
          <div className={cn("text-xl font-bold", pd.positive ? "text-[#10b981]" : "text-red-500")}>
            {pd.positive ? "+" : ""}{formatUSD(pd.gainLoss)}
          </div>
        </div>
      </div>

      {/* ── Card 3: Active Investments ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <h3 className="mb-6 text-sm font-bold text-gray-900">Active Investments</h3>
        <div className="flex flex-col items-center gap-6">
          <DonutChart segments={strategyAllocation} />
          <div className="w-full space-y-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Strategy Allocation
            </div>
            {strategyAllocation.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-gray-600">
                  <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-gray-900">{item.percent}%</span>
              </div>
            ))}
          </div>
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
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
          i
        </div>
        <p className="text-sm text-blue-900">
          Your allocated wallet balance of{" "}
          <span className="font-bold">{formatUSD(allocatedBalance)}</span> is NOT
          used for trading. It is for withdrawals and personal use only.
        </p>
      </div>
      <Link
        href={ROUTES.WALLET}
        className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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
      <span className="font-medium text-gray-500">Performance Period:</span>
      <div className="flex gap-1 rounded-lg border border-gray-100 bg-white p-1">
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period.toLowerCase())}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
              active === period.toLowerCase()
                ? "bg-[#C5A059]/10 font-bold text-[#C5A059]"
                : "text-gray-400 hover:bg-gray-50"
            )}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  );
}
