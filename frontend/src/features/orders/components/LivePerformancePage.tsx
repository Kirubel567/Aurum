"use client";

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

// ── Session equity/balance data (current trading session, no time intervals) ──
// Balance = realised value — steps up each time a trade closes in profit.
// Equity  = balance + floating P&L — fluctuates as open positions move.
// Y-axis range: $1,160 – $1,320 (covers both lines with breathing room).

const Y_MIN = 1160;
const Y_MAX = 1320;
const CHART_H = 200; // SVG viewBox height

// Map a dollar amount to an SVG Y coordinate (top = high value)
function toY(value: number) {
  return CHART_H - ((value - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H;
}

// Y-axis tick labels (5 levels, evenly spaced)
const Y_TICKS = [1320, 1280, 1240, 1200, 1160];

const SESSION = {
  balance: "$1,245.20",
  equity: "$1,291.80",
  floatingPL: "+$46.60",
  floatingPositive: true,
  drawdown: "—",
  // Time labels across the session
  labels: ["Open", "10:00", "12:00", "14:00", "16:00", "18:00", "Now"],
  // Balance steps up as trades close (realised gains)
  balancePath: [
    `M0,${toY(1200)}`,
    `L300,${toY(1200)}`,
    `L300,${toY(1218)}`,
    `L700,${toY(1218)}`,
    `L700,${toY(1232)}`,
    `L1000,${toY(1232)}`,
    `L1000,${toY(1245)}`,
    `L1200,${toY(1245)}`,
  ].join(" "),
  // Equity floats above balance, reflecting open trade gains
  equityPath: [
    `M0,${toY(1200)}`,
    `Q150,${toY(1212)} 300,${toY(1225)}`,
    `T550,${toY(1248)}`,
    `T700,${toY(1255)}`,
    `T850,${toY(1270)}`,
    `T1000,${toY(1278)}`,
    `T1150,${toY(1287)}`,
    `T1200,${toY(1292)}`,
  ].join(" "),
  equityAreaPath: [
    `M0,${toY(1200)}`,
    `Q150,${toY(1212)} 300,${toY(1225)}`,
    `T550,${toY(1248)}`,
    `T700,${toY(1255)}`,
    `T850,${toY(1270)}`,
    `T1000,${toY(1278)}`,
    `T1150,${toY(1287)}`,
    `T1200,${toY(1292)}`,
    // Close back along the balance line
    `L1200,${toY(1245)}`,
    `L1000,${toY(1245)}`,
    `L1000,${toY(1232)}`,
    `L700,${toY(1232)}`,
    `L700,${toY(1218)}`,
    `L300,${toY(1218)}`,
    `L300,${toY(1200)}`,
    `L0,${toY(1200)} Z`,
  ].join(" "),
};

// ── Equity / Balance chart ────────────────────────────────────────────────────

function LiveChart() {
  const s = SESSION;

  return (
    <section
      className="rounded-2xl p-6 sm:p-8 mb-8 overflow-hidden"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 mb-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#947600] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#947600] animate-pulse" />
            Live Equity &amp; Balance — Current Session
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-400">Floating exposure vs realised balance on open trades</p>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance</p>
            <p className="text-base font-bold text-slate-900">{s.balance}</p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equity</p>
            <p className="text-base font-bold text-[#947600]">{s.equity}</p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Floating P&amp;L</p>
            <p className={`text-base font-bold ${s.floatingPositive ? "text-emerald-600" : "text-red-500"}`}>
              {s.floatingPL}
            </p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drawdown</p>
            <p className="text-base font-bold text-slate-900">{s.drawdown}</p>
          </div>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <span className="inline-block h-0.5 w-5 bg-emerald-500 rounded-full" />
          Equity
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <span className="inline-block h-[2px] w-5 border-t-2 border-dashed border-slate-400" />
          Balance
        </span>
      </div>

      {/* ── Chart: Y-axis + SVG ────────────────────────────────────────────── */}
      <div className="flex gap-3">

        {/* Y-axis labels */}
        <div className="flex flex-col justify-between text-right shrink-0 pb-5" style={{ height: "180px" }}>
          {Y_TICKS.map((v) => (
            <span key={v} className="text-[9px] font-bold text-slate-400 leading-none">
              ${v.toLocaleString()}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative" style={{ height: "180px" }}>
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1200 200"
          >
            <defs>
              <linearGradient id="equity-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines */}
            {Y_TICKS.map((v) => (
              <line
                key={v}
                x1="0" y1={toY(v)}
                x2="1200" y2={toY(v)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            ))}

            {/* Equity fill */}
            <path d={s.equityAreaPath} fill="url(#equity-grad)" />

            {/* Balance — dashed slate */}
            <path
              d={s.balancePath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="8 5"
            />

            {/* Equity — solid green */}
            <path
              d={s.equityPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* X-axis time labels */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[10px] text-slate-400 tracking-wide">
            {s.labels.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
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
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f8f9fa]">
      {/* Header */}
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Live Performance</h1>
          <p className="text-sm text-slate-600 max-w-2xl mt-2">
            Monitor active algorithmic market executions, liquidity pools, and live trading metrics in real-time.
          </p>
        </div>
      </div>

      {/* Hero chart */}
      <LiveChart />

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
