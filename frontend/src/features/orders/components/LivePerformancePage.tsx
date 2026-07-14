"use client";

import { useLivePerformance } from "@/src/features/orders/hooks/useLivePerformance";
import type { ActiveExecution, EquitySnapshotPoint, LiveSessionStats, StrategyPool } from "@/src/types/trade.types";
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

// ── Live Chart — persisted prop-firm equity trace from /api/orders/live ──────
// Renders the equity_snapshots series: a dashed balance reference line plus
// the equity line, drawn segment-by-segment — green where equity ≥ balance
// (in profit), red where it's below (in drawdown). Never "sticks at 0":
// the y-domain is computed from the actual data with padding.

const CHART_W = 1200;
const CHART_H = 200;

interface ChartGeometry {
  equityPts: { x: number; y: number; equity: number; balance: number }[];
  balancePath: string;
  yTicks: number[];
  labels: string[];
}

function buildGeometry(series: EquitySnapshotPoint[]): ChartGeometry | null {
  if (series.length < 2) return null;
  const values = series.flatMap((p) => [p.equity, p.balance]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.1, Math.abs(rawMax) * 0.002, 1);
  const min = rawMin - pad;
  const max = rawMax + pad;
  const range = max - min;

  const toX = (i: number) => (i / (series.length - 1)) * CHART_W;
  const toY = (v: number) => CHART_H - ((v - min) / range) * CHART_H;

  const equityPts = series.map((p, i) => ({
    x: toX(i),
    y: toY(p.equity),
    equity: p.equity,
    balance: p.balance,
  }));
  const balancePath = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.balance)}`)
    .join(" ");

  const yTicks = [max, (max + min) / 2, min].map((v) => Math.round(v));

  // Up to 6 time labels from the snapshot timestamps.
  const step = Math.max(1, Math.floor(series.length / 5));
  const labels = series
    .filter((_, i) => i % step === 0 || i === series.length - 1)
    .map((p, i, arr) => {
      if (i === arr.length - 1) return "Now";
      const d = new Date(p.t);
      return Number.isNaN(d.getTime())
        ? p.t
        : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    });

  return { equityPts, balancePath, yTicks, labels };
}

// Splits the equity polyline into colored segments: green while equity ≥
// balance, red while below. Inserts the exact crossing point so the color
// flips precisely where the line crosses the balance reference.
function coloredSegments(pts: ChartGeometry["equityPts"]): { d: string; inProfit: boolean }[] {
  const segments: { d: string; inProfit: boolean }[] = [];
  let currentPath = `M${pts[0].x},${pts[0].y}`;
  let currentProfit = pts[0].equity >= pts[0].balance;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const next = pts[i];
    const nextProfit = next.equity >= next.balance;
    if (nextProfit === currentProfit) {
      currentPath += ` L${next.x},${next.y}`;
      continue;
    }
    // Interpolate the crossing where (equity - balance) hits zero.
    const dPrev = prev.equity - prev.balance;
    const dNext = next.equity - next.balance;
    const tRatio = dPrev / (dPrev - dNext || 1);
    const cx = prev.x + (next.x - prev.x) * tRatio;
    const cy = prev.y + (next.y - prev.y) * tRatio;
    currentPath += ` L${cx},${cy}`;
    segments.push({ d: currentPath, inProfit: currentProfit });
    currentPath = `M${cx},${cy} L${next.x},${next.y}`;
    currentProfit = nextProfit;
  }
  segments.push({ d: currentPath, inProfit: currentProfit });
  return segments;
}

function LiveChart({
  series,
  session,
}: {
  series: EquitySnapshotPoint[];
  session: LiveSessionStats;
}) {
  const geo = buildGeometry(series);
  const segments = geo ? coloredSegments(geo.equityPts) : [];

  // Current drawdown: % the live equity sits below the session's peak equity.
  const peakEquity = series.length > 0 ? Math.max(...series.map((p) => p.equity), session.equity) : session.equity;
  const drawdownPct = peakEquity > 0 ? Math.max(0, ((peakEquity - session.equity) / peakEquity) * 100) : 0;

  const s = {
    balance: formatUSD(session.balance),
    equity: formatUSD(session.equity),
    floatingPL: session.floatingPlKnown
      ? `${session.floatingPl >= 0 ? "+" : ""}${formatUSD(session.floatingPl)}`
      : "—",
    floatingPositive: session.floatingPl >= 0,
    drawdown: `${drawdownPct.toFixed(2)}%`,
    drawdownActive: drawdownPct > 0.01,
    labels: geo?.labels ?? [],
  };
  const yTicks = geo?.yTicks ?? [0, 0, 0];

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
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-white/40">
            Your live equity (balance + floating P&amp;L) over the last 24 hours — green in profit, red in drawdown
          </p>
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
            <p className={`text-base font-bold ${s.drawdownActive ? "text-red-500" : "text-slate-900 dark:text-white"}`}>{s.drawdown}</p>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-5 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-white/60">
          <span className="inline-block h-0.5 w-5 bg-emerald-500 rounded-full" />
          Equity in profit
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-white/60">
          <span className="inline-block h-0.5 w-5 bg-red-500 rounded-full" />
          Equity in drawdown
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-white/60">
          <span className="inline-block h-0.5 w-5 rounded-full border-t-2 border-dashed border-slate-400 dark:border-white/40" />
          Balance (realized)
        </span>
      </div>

      {/* ── Chart ── */}
      <div className="flex gap-3">
        <div className="flex flex-col justify-between text-right shrink-0 pb-5" style={{ height: "180px" }}>
          {yTicks.map((v, i) => (
            <span key={i} className="text-[9px] font-bold text-slate-400 dark:text-white/40 leading-none">
              ${v.toLocaleString()}
            </span>
          ))}
        </div>
        <div className="flex-1 relative" style={{ height: "180px" }}>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            <line x1="0" y1="0" x2={CHART_W} y2="0" stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-white/5" />
            <line x1="0" y1={CHART_H / 2} x2={CHART_W} y2={CHART_H / 2} stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-white/5" />
            <line x1="0" y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-white/5" />
            {geo && (
              <>
                {/* Balance reference line (dashed) */}
                <path
                  d={geo.balancePath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                  className="text-slate-400 dark:text-white/40"
                />
                {/* Equity line — green segments in profit, red in drawdown */}
                {segments.map((seg, i) => (
                  <path
                    key={i}
                    d={seg.d}
                    fill="none"
                    stroke={seg.inProfit ? "#10b981" : "#ef4444"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={seg.inProfit
                      ? { filter: "drop-shadow(0 0 8px rgba(16,185,129,0.35))" }
                      : { filter: "drop-shadow(0 0 8px rgba(239,68,68,0.35))" }}
                  />
                ))}
              </>
            )}
            {!geo && (
              <text x={CHART_W / 2} y={CHART_H / 2} textAnchor="middle" className="fill-slate-400 dark:fill-white/40" fontSize="14">
                Collecting equity history — check back in a minute
              </text>
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

function ExecutionsTable({ rows }: { rows: ActiveExecution[] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col
                 bg-white border border-gray-200 shadow-sm
                 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none"
    >
      <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Orders &amp; Executions</h3>
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

// ── Trade category card ───────────────────────────────────────────────────────

function CategoryIcon({ tagColor }: { tagColor: StrategyPool["tagColor"] }) {
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

function CategoryCard({ pool }: { pool: StrategyPool }) {
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
          <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{pool.allocation}% of Trades</p>
        </div>
        <div className="w-12 h-12 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center">
          <CategoryIcon tagColor={pool.tagColor} />
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
  const { data, loading, error } = useLivePerformance();

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
            Monitor active market executions, trade category breakdown, and live trading metrics in real-time.
          </p>
        </div>
      </div>

      {/* Hero chart */}
      <LiveChart series={data.equitySeries} session={data.session} />

      {/* Split grid */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <ExecutionsTable rows={data.executions} />
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {data.strategyPools.map((pool) => (
            <CategoryCard key={pool.id} pool={pool} />
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
