"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types (match /api/admin/liquidity) ─────────────────────────────────────────

interface TradeCategoryBreakdown {
  id: string;
  name: string;
  tag: string | null;
  tagColor: string;
  description: string | null;
  sortOrder: number;
  tradeCount: number;
  tradePct: number;
  openTrades: number;
}

interface LiquiditySummary {
  totalTrades: number;
  totalAum: number;
  pools: TradeCategoryBreakdown[];
}

// ── Presentation maps per category tag_color token ──────────────────────────────

const POOL_STYLE: Record<string, { icon: string; iconBg: string; iconColor: string; dot: string; bar: string; stroke: string }> = {
  gold: {
    icon: "bolt",
    iconBg: "bg-[#d4af37]/10 dark:bg-[#f2ca50]/10",
    iconColor: "text-[#d4af37] dark:text-[#f2ca50]",
    dot: "bg-[#d4af37] dark:bg-[#f2ca50]",
    bar: "bg-[#d4af37] dark:bg-[#f2ca50]",
    stroke: "#d4af37",
  },
  slate: {
    icon: "waves",
    iconBg: "bg-emerald-50 dark:bg-[#4edea3]/10",
    iconColor: "text-emerald-600 dark:text-[#4edea3]",
    dot: "bg-emerald-500 dark:bg-[#4edea3]",
    bar: "bg-emerald-500 dark:bg-[#4edea3]",
    stroke: "#10b981",
  },
  dark: {
    icon: "public",
    iconBg: "bg-slate-100 dark:bg-white/10",
    iconColor: "text-slate-600 dark:text-[#dce3f0]",
    dot: "bg-slate-500 dark:bg-[#dce3f0]",
    bar: "bg-slate-500 dark:bg-[#dce3f0]",
    stroke: "#64748b",
  },
};

const FALLBACK_STYLE = POOL_STYLE.gold;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtUsd(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const CIRCUMFERENCE = 251.2; // 2πr with r = 40

// ── Component ──────────────────────────────────────────────────────────────────

export default function AssetLiquidityPage() {
  const [summary, setSummary]         = useState<LiquiditySummary | null>(null);
  const [loadError, setLoadError]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/liquidity");
      if (!res.ok) throw new Error("load failed");
      setSummary(await res.json());
      setLastUpdated(new Date());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportCSV() {
    if (!summary) return;
    const rows = [
      "Category,Tag,Trades Taken,% of Total,Open Trades",
      ...summary.pools.map((p) =>
        `"${p.name}","${p.tag ?? ""}",${p.tradeCount},${p.tradePct}%,${p.openTrades}`
      ),
      "",
      `Total Trades,${summary.totalTrades}`,
      `Total AUM (all investors),"${fmtUsd(summary.totalAum)}"`,
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "trade_category_breakdown.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const pools = summary?.pools ?? [];
  const totalOpenTrades = pools.reduce((s, p) => s + p.openTrades, 0);

  const glassCard =
    "glass-card rounded-xl bg-white dark:bg-[rgba(25,32,42,0.6)] dark:backdrop-blur-md dark:border dark:border-[rgba(255,255,255,0.1)]";

  // Donut segments: consecutive arcs sized by each category's trade %.
  let cumulative = 0;
  const donutSegments = pools.map((p) => {
    const style = POOL_STYLE[p.tagColor] ?? FALLBACK_STYLE;
    const len = (p.tradePct / 100) * CIRCUMFERENCE;
    const seg = { pool: p, style, len, offset: -((cumulative / 100) * CIRCUMFERENCE) };
    cumulative += p.tradePct;
    return seg;
  });

  return (
    <div className="px-4 sm:p-6 pt-6 bg-slate-50 dark:bg-[#050b14] h-full overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-slate-900 dark:text-[#dce3f0]">Trade Categories</h2>
          <p className="text-slate-600 dark:text-[#d0c5af] font-body-md text-body-md">
            How trades taken so far are distributed across trade categories.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-[#19202a] px-3 py-1.5 rounded border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] dark:bg-[#f2ca50]" />
            <span className="text-sm font-data-mono font-semibold text-slate-600 dark:text-[#d0c5af]">
              {summary ? `${summary.totalTrades} trade${summary.totalTrades === 1 ? "" : "s"} total` : "Loading…"}
            </span>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 bg-white dark:bg-[#19202a] px-3 py-1.5 rounded border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-[#d0c5af]">refresh</span>
            <span className="text-sm font-data-mono text-slate-500 dark:text-[#d0c5af]">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading…"}
            </span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 bg-red-50 dark:bg-[#ffb4ab]/10 border border-red-200 dark:border-[#ffb4ab]/20 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-[#ffb4ab] flex items-center justify-between">
          <span>Failed to load trade category breakdown.</span>
          <button onClick={load} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Trade Category Breakdown donut */}
        <div className={`col-span-12 lg:col-span-8 ${glassCard} p-6 flex flex-col md:flex-row items-center gap-10`}>
          <div className="relative w-64 h-64 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f1f5f9" className="dark:[stroke:rgba(255,255,255,0.05)]" strokeWidth="12" />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.pool.id}
                  cx="50" cy="50" fill="transparent" r="40"
                  stroke={seg.style.stroke}
                  strokeDasharray={`${seg.len} ${CIRCUMFERENCE - seg.len}`}
                  strokeDashoffset={seg.offset}
                  strokeWidth="12"
                  style={{ transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease" }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Total Trades</span>
              <span className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">
                {summary ? summary.totalTrades : "—"}
              </span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <h3 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] mb-4">Trade Category Breakdown</h3>
            {pools.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-[#99907c] py-6">
                {summary ? "No active trade categories." : "Loading categories…"}
              </p>
            ) : (
              <div className="space-y-4">
                {pools.map((pool) => {
                  const style = POOL_STYLE[pool.tagColor] ?? FALLBACK_STYLE;
                  return (
                    <div key={pool.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                        <span className="font-body-md text-body-md text-slate-700 dark:text-[#dce3f0] font-semibold">{pool.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-data-mono text-slate-900 dark:text-[#dce3f0]">{pool.tradeCount} trade{pool.tradeCount === 1 ? "" : "s"}</p>
                        <p className="text-xs text-slate-500 dark:text-[#d0c5af]">{pool.tradePct}% of all trades</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className={`${glassCard} p-6 flex-1`}>
            <p className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Open Trades</p>
            <div className="flex items-end justify-between mt-2">
              <span className="font-display-lg text-display-lg font-bold text-slate-900 dark:text-[#f2ca50]">
                {summary ? totalOpenTrades : "—"}
              </span>
              <span className="text-slate-500 dark:text-[#d0c5af] font-data-mono mb-2 text-sm">across all categories</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 mt-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4af37] dark:bg-[#f2ca50] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, totalOpenTrades * 10)}%` }}
              />
            </div>
          </div>
          <div className={`${glassCard} p-6 flex-1`}>
            <p className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Total AUM</p>
            <div className="flex items-end justify-between mt-2">
              <span className="font-display-lg text-display-lg font-bold text-slate-900 dark:text-[#dce3f0]">
                {summary ? fmtUsd(summary.totalAum, true) : "—"}
              </span>
              <span className="text-slate-500 dark:text-[#d0c5af] font-data-mono mb-2 text-sm">all investors</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-[#d0c5af] mt-4">
              Each investor&apos;s capital is managed individually — this is informational context only.
            </p>
          </div>
        </div>

        {/* Trade Categories Table */}
        <div className={`col-span-12 ${glassCard} overflow-hidden`}>
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
            <h3 className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">Trade Categories</h3>
            <button
              onClick={exportCSV}
              disabled={!summary}
              className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dce3f0] rounded font-label-caps hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-xs font-bold disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-transparent">
                  <th className="px-6 py-4 font-bold">Category</th>
                  <th className="px-6 py-4 font-bold">Trades Taken</th>
                  <th className="px-6 py-4 font-bold text-center">% of Total</th>
                  <th className="px-6 py-4 font-bold text-center">Open Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {pools.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-[#99907c]">
                      {summary ? "No active trade categories found." : "Loading…"}
                    </td>
                  </tr>
                ) : (
                  pools.map((pool) => {
                    const style = POOL_STYLE[pool.tagColor] ?? FALLBACK_STYLE;
                    return (
                      <tr key={pool.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center ${style.iconColor}`}>
                              <span className="material-symbols-outlined">{style.icon}</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-[#dce3f0]">{pool.name}</p>
                              <p className="text-xs text-slate-500 dark:text-[#d0c5af]">{pool.tag ?? pool.description ?? ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-data-mono text-slate-900 dark:text-[#dce3f0] font-semibold">
                          {pool.tradeCount}
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-32 mx-auto">
                            <div className="flex justify-center mb-1">
                              <span className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-bold uppercase">{pool.tradePct}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                              <div className={`h-full ${style.bar} transition-all duration-700`} style={{ width: `${Math.min(100, pool.tradePct)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-data-mono text-slate-700 dark:text-[#dce3f0]">{pool.openTrades}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
