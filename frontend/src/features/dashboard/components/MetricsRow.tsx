"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";

import { formatUSD } from "@/src/lib/formatters/currency";
import { ROUTES } from "@/src/lib/constants/routes";
import type { DashboardMetrics } from "@/src/types/dashboard.types";
import { cn } from "@/lib/utils";

interface MetricsRowProps {
  metrics: DashboardMetrics;
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
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
        />
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

export function MetricsRow({ metrics }: MetricsRowProps) {
  const { fundPerformance, accountOverview, strategyAllocation, traderInsights } =
    metrics;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-4">
      <div className="relative overflow-hidden rounded-2xl bg-[#050b14] p-6 text-white">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-400">
              Fund Performance
              <ExternalLink className="size-3" />
            </h3>
            <div className="text-2xl font-bold text-[#10b981]">
              +{fundPerformance.ytdPercent}%{" "}
              <span className="text-xs font-medium opacity-70">YTD</span>
            </div>
          </div>
          <span className="rounded border border-[#10b981]/30 bg-[#10b981]/20 px-2 py-1 text-[10px] font-bold text-[#10b981]">
            Live Performance
          </span>
        </div>
        <Sparkline points={fundPerformance.sparkline} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-[10px] font-bold text-gray-500 uppercase">
              Total Profit
            </div>
            <div className="text-xl font-extrabold">
              {formatUSD(fundPerformance.totalProfit)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold text-gray-500 uppercase">
              Net Return
            </div>
            <div className="text-xl font-extrabold">
              {formatUSD(fundPerformance.netReturn)}
            </div>
          </div>
        </div>
      </div>

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
            Daily Gain/Loss
          </div>
          <div className="text-xl font-bold text-[#10b981]">
            +{formatUSD(accountOverview.dailyGainLoss)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Active Investments</h3>
        <div className="flex items-center gap-6">
          <DonutChart segments={strategyAllocation} />
          <div className="flex-1 space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase">
              Strategy Allocation
            </div>
            {strategyAllocation.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-600">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <span className="font-bold">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Trader Insights</h3>
        <div className="space-y-4">
          {traderInsights.map((trader) => (
            <div key={trader.id} className="flex items-start gap-3">
              <Image
                src={trader.avatarUrl}
                alt={trader.name}
                width={40}
                height={40}
                className="size-10 rounded-lg object-cover"
              />
              <div>
                <div className="text-sm leading-tight font-bold text-gray-900">
                  {trader.name}
                </div>
                <div className="line-clamp-2 text-[10px] leading-tight text-gray-500">
                  {trader.bio}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#10b981]">
                  <Sparkles className="size-3" />
                  Performance: {trader.performanceLabel}
                </div>
              </div>
            </div>
          ))}
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
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
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
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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
    <div className="mb-6 flex items-center gap-4 text-sm">
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
