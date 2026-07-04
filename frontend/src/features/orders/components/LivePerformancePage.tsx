"use client";

import { useLivePerformance } from "@/src/features/orders/hooks/useLivePerformance";
import type { ActiveExecution, LiveSessionStats, StrategyPool } from "@/src/types/trade.types";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/src/lib/formatters/currency";

// Stitch dark tokens: bg #050b14, glass rgba(255,255,255,0.03)+blur(12px)+border rgba(255,255,255,0.1)
// tertiary/gold: #e9c349, table-thead bg: #161c22

// ── Time selector ─────────────────────────────────────────────────────────────

function TimeSelector({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200 dark:bg-white/5 dark:border-white/10">
      {["1H", "4H", "1D"].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "px-4 py-1.5 text-xs rounded-md transition-colors",
            active === t
              ? "bg-white shadow-sm text-slate-900 font-bold border border-gray-200 dark:bg-white/10 dark:border-white/20 dark:text-white"
              : "text-slate-500 hover:bg-gray-200 dark:text-white/40 dark:hover:bg-white/10"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Live Chart — real 24h equity curve from /api/orders/live ─────────────────

const CHART_H = 200;

// Builds an SVG path from the API's { x, y } points (already scaled to the
// 1200x160 space by the server) and rescales onto this component's 1200x200
// viewBox to match the original design's proportions.
function pathFromPoints(points: { x: number; y: number }[]): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" };
  const scaled = points.map((p) => ({ x: p.x, y: (p.y / 160) * CHART_H }));
  const line = scaled.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const last = scaled[scaled.length - 1];
  const first = scaled[0];
  const area = `${line} L${last.x},${CHART_H} L${first.x},${CHART_H} Z`;
  return { line, area };
}

function LiveChart({
  points,
  chartRange,
  timeLabels,
  session,
}: {
  points: { x: number; y: number }[];
  chartRange: { min: number; max: number };
  timeLabels: string[];
  session: LiveSessionStats;
}) {
  const { line: equityPath, area: equityAreaPath } = pathFromPoints(points);
  const yTicks = [chartRange.max, Math.round((chartRange.max + chartRange.min) / 2), chartRange.min];
  const s = {
    balance: formatUSD(session.balance),
    equity: formatUSD(session.equity),
    floatingPL: session.floatingPlKnown
      ? `${session.floatingPl >= 0 ? "+" : ""}${formatUSD(session.floatingPl)}`
      : "—",
    floatingPositive: session.floatingPl >= 0,
    drawdown: "—", // platform-wide drawdown arrives with Phase 16's risk metrics
    labels: timeLabels,
  };

  return (
    <section
      className="rounded-2xl p-6 sm:p-8 mb-8 overflow-hidden
                 bg-white border border-gray-200 shadow-sm
                 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none"
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 mb-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#947600] dark:text-[#e9c349] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#947600] dark:bg-[#e9c349] animate-pulse" />
            Live Equity &amp; Balance — Current Session
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-white/40">Your wallet balance over the last 24 hours (realized gains only)</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Balance</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">{s.balance}</p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-white/10" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Equity</p>
            <p className="text-base font-bold text-[#947600] dark:text-[#e9c349]">{s.equity}</p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-white/10" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Floating P&amp;L</p>
            <p className={`text-base font-bold ${s.floatingPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {s.floatingPL}
            </p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-white/10" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Drawdown</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">{s.drawdown}</p>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-white/60">
          <span className="inline-block h-0.5 w-5 bg-emerald-500 rounded-full" />
          Equity (realized — deposits, yield, closed trades)
        </span>
      </div>

      {/* ── Chart ── */}
      <div className="flex gap-3">
        <div className="flex flex-col justify-between text-right shrink-0 pb-5" style={{ height: "180px" }}>
          {yTicks.map((v) => (
            <span key={v} className="text-[9px] font-bold text-slate-400 dark:text-white/40 leading-none">
              ${v.toLocaleString()}
            </span>
          ))}
        </div>
        <div className="flex-1 relative" style={{ height: "180px" }}>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 200">
            <defs>
              <linearGradient id="equity-grad-light" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="equity-grad-dark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#e9c349" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#e9c349" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="0" x2="1200" y2="0" stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-white/5" />
            <line x1="0" y1="100" x2="1200" y2="100" stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-white/5" />
            <line x1="0" y1="200" x2="1200" y2="200" stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-white/5" />
            {points.length > 0 && (
              <>
                <path className="dark:hidden" d={equityAreaPath} fill="url(#equity-grad-light)" />
                <path className="hidden dark:block" d={equityAreaPath} fill="url(#equity-grad-dark)" />
                <path className="dark:hidden" d={equityPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path className="hidden dark:block" d={equityPath} fill="none" stroke="#e9c349" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 12px rgba(233,195,73,0.5))" }} />
              </>
            )}
          </svg>
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[10px] text-slate-400 dark:text-white/40 tracking-wide">
            {s.labels.map((t, i) => (
              <span key={`${t}-${i}`}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Executions table ──────────────────────────────────────────────────────────

function ExecutionsTable({
  rows,
  liveSync,
  onToggleLiveSync,
}: {
  rows: ActiveExecution[];
  liveSync: boolean;
  onToggleLiveSync: () => void;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col
                 bg-white border border-gray-200 shadow-sm
                 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none"
    >
      <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Orders &amp; Executions</h3>
        <button
          type="button"
          onClick={onToggleLiveSync}
          title={liveSync ? "Live sync active — click to pause" : "Live sync paused — click to resume"}
          className={cn(
            "text-xs px-3 py-1 rounded-full flex items-center gap-1 border transition-colors",
            liveSync
              ? "text-[#947600] dark:text-[#e9c349] bg-[#e9c349]/10 border-[#e9c349]/20 hover:bg-[#e9c349]/20"
              : "text-slate-400 dark:text-white/30 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
          )}
        >
          <span className={cn("material-symbols-outlined text-[14px]", liveSync && "animate-spin")}>sync</span>
          {liveSync ? "Real-time Sync" : "Sync Paused"}
        </button>
      </div>
      <div
        className="flex-1 overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]
                   dark:[scrollbar-color:rgba(255,255,255,0.12)_transparent]
                   [&::-webkit-scrollbar]:h-1.5
                   [&::-webkit-scrollbar-track]:bg-transparent
                   [&::-webkit-scrollbar-thumb]:rounded-full
                   [&::-webkit-scrollbar-thumb]:bg-gray-200
                   dark:[&::-webkit-scrollbar-thumb]:bg-white/10"
      >
        <table className="w-full min-w-[600px] text-left">
          <thead className="sticky top-0 bg-gray-50 dark:bg-[#161c22] z-10">
            <tr>
              {["Time", "Asset Pair", "Type", "Leverage", "Entry", "Current", "P/L"].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-6 py-4 text-[10px] text-slate-500 dark:text-white/60 font-bold uppercase tracking-wider",
                    i >= 4 ? "text-right" : ""
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-xs text-slate-500 dark:text-white/40">{row.time}</td>
                <td className="px-6 py-4 text-slate-900 dark:text-white font-bold text-sm">{row.assetPair}</td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                      row.type === "LONG"
                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border dark:border-emerald-500/20"
                        : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border dark:border-red-500/20"
                    )}
                  >
                    {row.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-white/40 text-sm">{row.leverage}</td>
                <td className="px-6 py-4 text-slate-900 dark:text-white font-mono text-sm text-right">{row.entry}</td>
                <td className="px-6 py-4 text-slate-900 dark:text-white font-mono text-sm text-right">{row.current}</td>
                <td className="px-6 py-4 text-right">
                  <span
                    className="text-xs font-bold"
                    style={{ color: row.plPositive ? "#22c55e" : "#f87171" }}
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

function PoolIcon({ tagColor }: { tagColor: StrategyPool["tagColor"] }) {
  const colorClass =
    tagColor === "gold"
      ? "text-[#947600] dark:text-[#e9c349]"
      : tagColor === "slate"
        ? "text-slate-500 dark:text-white/60"
        : "text-slate-900 dark:text-white";
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
  const borderColor =
    pool.tagColor === "gold"
      ? "#e9c349"
      : pool.tagColor === "slate"
        ? "#94a3b8"
        : "#dde3eb";

  const barClass =
    pool.tagColor === "gold"
      ? "bg-[#e9c349]"
      : pool.tagColor === "slate"
        ? "bg-slate-400 dark:bg-white/40"
        : "bg-slate-900 dark:bg-white/80";

  const tagColorClass =
    pool.tagColor === "gold"
      ? "text-[#947600] dark:text-[#e9c349]"
      : pool.tagColor === "slate"
        ? "text-slate-700 dark:text-white/80"
        : "text-slate-900 dark:text-white";

  return (
    <div
      className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)] dark:shadow-none"
      style={{ borderLeftWidth: 4, borderLeftStyle: "solid", borderLeftColor: borderColor }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest">{pool.name}</h4>
          <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{pool.allocation}% Allocation</p>
        </div>
        <div className="w-12 h-12 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center">
          <PoolIcon tagColor={pool.tagColor} />
        </div>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", barClass)}
          style={{ width: `${pool.allocation}%` }}
        />
      </div>
      <div className="flex justify-between mt-4 text-[11px] text-slate-500 dark:text-white/60">
        <span>{pool.pool}</span>
        <span className={cn("font-bold", tagColorClass)}>{pool.tag}</span>
      </div>
    </div>
  );
}

// ── Bottom metrics ────────────────────────────────────────────────────────────

type MetricIconType = "trending" | "bolt" | "bank" | "warning";

const METRIC_ICON_STYLES: Record<MetricIconType, { bg: string; darkBg: string; color: string; symbol: string }> = {
  trending: { bg: "bg-emerald-50",        darkBg: "dark:bg-emerald-500/10",        color: "text-emerald-600 dark:text-emerald-400", symbol: "trending_up" },
  bolt:     { bg: "bg-yellow-50",         darkBg: "dark:bg-[#e9c349]/10",          color: "text-[#947600] dark:text-[#e9c349]",    symbol: "bolt" },
  bank:     { bg: "bg-blue-50",           darkBg: "dark:bg-blue-500/10",           color: "text-blue-600 dark:text-blue-400",      symbol: "account_balance" },
  warning:  { bg: "bg-red-50",            darkBg: "dark:bg-red-500/10",            color: "text-red-600 dark:text-red-400",        symbol: "warning" },
};

// ── Page root ─────────────────────────────────────────────────────────────────

export function LivePerformancePage() {
  const { data, loading, error, liveSync, toggleLiveSync } = useLivePerformance();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500 dark:text-white/40">
        Loading live performance...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-red-500 dark:text-[#ffb4ab]">
        {error ?? "Unable to load performance data."}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f8f9fa] dark:bg-[#050b14]">
      {/* Header */}
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Live Performance</h1>
          <p className="text-sm text-slate-600 dark:text-white/60 max-w-2xl mt-2">
            Monitor active algorithmic market executions, liquidity pools, and live trading metrics in real-time.
          </p>
        </div>
      </div>

      {/* Hero chart */}
      <LiveChart points={data.chartPoints} chartRange={data.chartRange} timeLabels={data.timeLabels} session={data.session} />

      {/* Split grid */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <ExecutionsTable rows={data.executions} liveSync={liveSync} onToggleLiveSync={toggleLiveSync} />
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
              className="rounded-xl p-5 flex items-center space-x-4 bg-white border border-gray-200 shadow-sm dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none"
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", style.bg, style.darkBg, style.color)}>
                <span className="material-symbols-outlined text-[20px]">{style.symbol}</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider">{m.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{m.value}</p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
