"use client";

import { useState } from "react";

import { useLivePerformance } from "@/src/features/orders/hooks/useLivePerformance";
import type { ActiveExecution, StrategyPool } from "@/src/types/trade.types";
import { cn } from "@/lib/utils";

// ── Time selector ─────────────────────────────────────────────────────────────

function TimeSelector({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
      {["1H", "4H", "1D"].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "px-4 py-1.5 text-xs rounded-md transition-colors",
            active === t
              ? "bg-white shadow-sm text-slate-900 font-bold border border-gray-200"
              : "text-slate-500 hover:bg-gray-200"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Hero chart ────────────────────────────────────────────────────────────────

function LiveChart({ liveVolume, totalLiquidity, timeLabels }: {
  liveVolume: string;
  totalLiquidity: string;
  timeLabels: string[];
}) {
  return (
    <section
      className="rounded-2xl p-8 mb-8 relative overflow-hidden"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
      }}
    >
      {/* Top-right stats */}
      <div className="absolute top-0 right-0 p-4 sm:p-8">
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-6 sm:space-x-0">
          <div className="text-right">
            <p className="text-xs text-slate-500">Live Volume</p>
            <p className="text-base font-bold text-[#947600]">{liveVolume}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Liquidity</p>
            <p className="text-base font-bold text-slate-900">{totalLiquidity}</p>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#947600] flex items-center">
          <span className="w-2 h-2 rounded-full bg-[#947600] mr-2 animate-pulse" />
          Live Asset Yields &amp; Trading Volume
        </h3>
      </div>

      {/* SVG chart */}
      <div className="h-64 w-full relative">
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1200 200"
        >
          <defs>
            <linearGradient id="yield-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e9c349" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#e9c349" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,150 Q100,120 200,140 T400,100 T600,130 T800,80 T1000,110 T1200,60 L1200,200 L0,200 Z"
            fill="url(#yield-grad)"
          />
          <path
            d="M0,150 Q100,120 200,140 T400,100 T600,130 T800,80 T1000,110 T1200,60"
            fill="none"
            stroke="#e9c349"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {/* Time labels */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-slate-400 uppercase tracking-widest">
          {timeLabels.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Executions table ──────────────────────────────────────────────────────────

function ExecutionsTable({ rows }: { rows: ActiveExecution[] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
      }}
    >
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-base font-bold text-slate-900">Active Orders &amp; Executions</h3>
        <span className="text-xs text-[#947600] bg-[#e9c349]/10 px-3 py-1 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">sync</span>
          Real-time Sync
        </span>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              {["Time", "Asset Pair", "Type", "Leverage", "Entry", "Current", "P/L"].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-6 py-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider",
                    i >= 4 ? "text-right" : ""
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-xs text-slate-500">{row.time}</td>
                <td className="px-6 py-4 text-slate-900 font-bold text-sm">{row.assetPair}</td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                      row.type === "LONG"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {row.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">{row.leverage}</td>
                <td className="px-6 py-4 text-slate-900 font-mono text-sm text-right">{row.entry}</td>
                <td className="px-6 py-4 text-slate-900 font-mono text-sm text-right">{row.current}</td>
                <td className="px-6 py-4 text-right">
                  <span
                    className="text-xs font-bold"
                    style={{ color: row.plPositive ? "#16a34a" : "#dc2626" }}
                  >
                    {row.pl}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Strategy pool card ────────────────────────────────────────────────────────

const POOL_BORDER: Record<StrategyPool["tagColor"], string> = {
  gold: "border-[#e9c349]",
  slate: "border-slate-400",
  dark: "border-slate-900",
};
const POOL_TAG_COLOR: Record<StrategyPool["tagColor"], string> = {
  gold: "text-[#947600]",
  slate: "text-slate-700",
  dark: "text-slate-900",
};
const POOL_BAR: Record<StrategyPool["tagColor"], string> = {
  gold: "bg-[#e9c349]",
  slate: "bg-slate-400",
  dark: "bg-slate-900",
};

function PoolIcon({ tagColor }: { tagColor: StrategyPool["tagColor"] }) {
  const colorClass =
    tagColor === "gold" ? "text-[#947600]" : tagColor === "slate" ? "text-slate-500" : "text-slate-900";
  const icon =
    tagColor === "gold"
      ? "currency_exchange"
      : tagColor === "slate"
        ? "diamond"
        : "stacked_line_chart";
  return (
    <span className={cn("material-symbols-outlined text-[24px]", colorClass)}>
      {icon}
    </span>
  );
}

function PoolCard({ pool }: { pool: StrategyPool }) {
  return (
    <div
      className={cn("p-6 rounded-2xl border-l-4", POOL_BORDER[pool.tagColor])}
      style={{
        background: "#ffffff",
        border: `1px solid #e5e7eb`,
        borderLeftWidth: "4px",
        borderLeftColor: pool.tagColor === "gold" ? "#e9c349" : pool.tagColor === "slate" ? "#94a3b8" : "#0f172a",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{pool.name}</h4>
          <p className="text-lg font-semibold text-slate-900 mt-1">{pool.allocation}% Allocation</p>
        </div>
        <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center">
          <PoolIcon tagColor={pool.tagColor} />
        </div>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", POOL_BAR[pool.tagColor])}
          style={{ width: `${pool.allocation}%` }}
        />
      </div>
      <div className="flex justify-between mt-4 text-[11px] text-slate-500">
        <span>{pool.pool}</span>
        <span className={cn("font-bold", POOL_TAG_COLOR[pool.tagColor])}>{pool.tag}</span>
      </div>
    </div>
  );
}

// ── Bottom metrics ────────────────────────────────────────────────────────────

type MetricIconType = "trending" | "bolt" | "bank" | "warning";

const METRIC_ICON_STYLES: Record<MetricIconType, { bg: string; color: string; symbol: string }> = {
  trending: { bg: "bg-emerald-50", color: "text-emerald-600", symbol: "trending_up" },
  bolt:     { bg: "bg-yellow-50",  color: "text-[#947600]",   symbol: "bolt" },
  bank:     { bg: "bg-blue-50",    color: "text-blue-600",    symbol: "account_balance" },
  warning:  { bg: "bg-red-50",     color: "text-red-600",     symbol: "warning" },
};

// ── Page root ─────────────────────────────────────────────────────────────────

export function LivePerformancePage() {
  const { data, loading, error } = useLivePerformance();
  const [timeframe, setTimeframe] = useState("1H");

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading live performance...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-red-500">
        {error ?? "Unable to load performance data."}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Live Performance</h1>
          <p className="text-sm text-slate-600 max-w-2xl mt-2">
            Monitor active algorithmic market executions, liquidity pools, and live trading metrics in real-time.
          </p>
        </div>
        <div className="shrink-0">
          <TimeSelector active={timeframe} onChange={setTimeframe} />
        </div>
      </div>

      {/* Hero chart */}
      <LiveChart
        liveVolume={data.liveVolume}
        totalLiquidity={data.totalLiquidity}
        timeLabels={data.timeLabels}
      />

      {/* Split grid */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <ExecutionsTable rows={data.executions} />
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {data.strategyPools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      </div>

      {/* Bottom metrics */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8">
        {data.metrics.map((m) => {
          const style = METRIC_ICON_STYLES[m.icon];
          return (
            <div
              key={m.label}
              className="rounded-xl p-5 flex items-center space-x-4"
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
              }}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", style.bg, style.color)}>
                <span className="material-symbols-outlined text-[20px]">{style.symbol}</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{m.label}</p>
                <p className="text-lg font-bold text-slate-900">{m.value}</p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
