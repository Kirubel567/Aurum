"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types (match /api/admin/liquidity) ─────────────────────────────────────────

interface LiquidityPool {
  id: string;
  name: string;
  tag: string | null;
  tagColor: string;
  description: string | null;
  sortOrder: number;
  targetAllocationPct: number;
  allocatedUsd: number;
  allocatedPct: number;
  investorCount: number;
  openTrades: number;
}

interface LiquiditySummary {
  totalAum: number;
  pools: LiquidityPool[];
}

type PoolStatus = "On Target" | "Drifting" | "Off Target";

// ── Presentation maps per pool tag_color token ─────────────────────────────────

const POOL_STYLE: Record<string, { icon: string; iconBg: string; iconColor: string; dot: string; bar: string; stroke: string; darkStroke: string }> = {
  gold: {
    icon: "bolt",
    iconBg: "bg-[#d4af37]/10 dark:bg-[#f2ca50]/10",
    iconColor: "text-[#d4af37] dark:text-[#f2ca50]",
    dot: "bg-[#d4af37] dark:bg-[#f2ca50]",
    bar: "bg-[#d4af37] dark:bg-[#f2ca50]",
    stroke: "#d4af37",
    darkStroke: "#f2ca50",
  },
  slate: {
    icon: "waves",
    iconBg: "bg-emerald-50 dark:bg-[#4edea3]/10",
    iconColor: "text-emerald-600 dark:text-[#4edea3]",
    dot: "bg-emerald-500 dark:bg-[#4edea3]",
    bar: "bg-emerald-500 dark:bg-[#4edea3]",
    stroke: "#10b981",
    darkStroke: "#4edea3",
  },
  dark: {
    icon: "public",
    iconBg: "bg-slate-100 dark:bg-white/10",
    iconColor: "text-slate-600 dark:text-[#dce3f0]",
    dot: "bg-slate-500 dark:bg-[#dce3f0]",
    bar: "bg-slate-500 dark:bg-[#dce3f0]",
    stroke: "#64748b",
    darkStroke: "#dce3f0",
  },
};

const FALLBACK_STYLE = POOL_STYLE.gold;

const STATUS_CLASSES: Record<PoolStatus, string> = {
  "Off Target": "bg-red-100 dark:bg-[#ffb4ab]/10 text-red-700 dark:text-[#ffb4ab] border border-red-200 dark:border-[#ffb4ab]/20",
  "On Target":  "bg-emerald-100 dark:bg-[#4edea3]/10 text-emerald-700 dark:text-[#4edea3] border border-emerald-200 dark:border-[#4edea3]/20",
  "Drifting":   "bg-amber-100 dark:bg-[#f2ca50]/10 text-amber-700 dark:text-[#f2ca50] border border-amber-200 dark:border-[#f2ca50]/20",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtUsd(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// A pool's health is how far its actual allocation drifted from its target.
function poolStatus(pool: LiquidityPool): PoolStatus {
  const drift = Math.abs(pool.allocatedPct - pool.targetAllocationPct);
  if (drift > 10) return "Off Target";
  if (drift > 5) return "Drifting";
  return "On Target";
}

const CIRCUMFERENCE = 251.2; // 2πr with r = 40

// ── Component ──────────────────────────────────────────────────────────────────

export default function AssetLiquidityPage() {
  const [summary, setSummary]           = useState<LiquiditySummary | null>(null);
  const [loadError, setLoadError]       = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);
  const [sliderVal, setSliderVal]       = useState(0);
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  function openModal(pool: LiquidityPool) {
    setSelectedPool(pool);
    setSliderVal(pool.targetAllocationPct);
    setSaveError(null);
  }

  async function executeRebalance() {
    if (!selectedPool || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/liquidity/${selectedPool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAllocationPct: sliderVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rebalance failed");
      setSelectedPool(null);
      showToast(`${selectedPool.name} target set to ${sliderVal}%.`);
      await load();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    if (!summary) return;
    const rows = [
      "Pool,Tag,Allocated USD,Allocated %,Target %,Investors,Open Trades,Status",
      ...summary.pools.map((p) =>
        `"${p.name}","${p.tag ?? ""}","${fmtUsd(p.allocatedUsd)}",${p.allocatedPct}%,${p.targetAllocationPct}%,${p.investorCount},${p.openTrades},${poolStatus(p)}`
      ),
      "",
      `Total AUM,"${fmtUsd(summary.totalAum)}"`,
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "liquidity_pools.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const pools = summary?.pools ?? [];
  const totalOpenTrades = pools.reduce((s, p) => s + p.openTrades, 0);
  const totalInvestorSlots = pools.reduce((s, p) => s + p.investorCount, 0);
  const offTarget = pools.filter((p) => poolStatus(p) === "Off Target").length;

  const glassCard =
    "glass-card rounded-xl bg-white dark:bg-[rgba(25,32,42,0.6)] dark:backdrop-blur-md dark:border dark:border-[rgba(255,255,255,0.1)]";

  // Donut segments: consecutive arcs sized by each pool's real allocatedPct.
  let cumulative = 0;
  const donutSegments = pools.map((p) => {
    const style = POOL_STYLE[p.tagColor] ?? FALLBACK_STYLE;
    const len = (p.allocatedPct / 100) * CIRCUMFERENCE;
    const seg = { pool: p, style, len, offset: -((cumulative / 100) * CIRCUMFERENCE) };
    cumulative += p.allocatedPct;
    return seg;
  });

  return (
    <div className="px-4 sm:p-6 pt-6 bg-slate-50 dark:bg-[#050b14] h-full overflow-y-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[110] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold bg-emerald-500 text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {toast}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-slate-900 dark:text-[#dce3f0]">Asset Liquidity</h2>
          <p className="text-slate-600 dark:text-[#d0c5af] font-body-md text-body-md">
            Strategy pool allocation targets and live capital distribution.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-[#19202a] px-3 py-1.5 rounded border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <span className={`w-2 h-2 rounded-full animate-pulse ${offTarget > 0 ? "bg-red-500 dark:bg-[#ffb4ab]" : "bg-emerald-500 dark:bg-[#4edea3]"}`} />
            <span className={`text-sm font-data-mono font-semibold ${offTarget > 0 ? "text-red-600 dark:text-[#ffb4ab]" : "text-emerald-600 dark:text-[#4edea3]"}`}>
              {offTarget > 0 ? `${offTarget} pool${offTarget === 1 ? "" : "s"} off target` : "Pools: Balanced"}
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
          <span>Failed to load liquidity data.</span>
          <button onClick={load} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Total Liquidity Breakdown */}
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
              <span className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Total AUM</span>
              <span className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">
                {summary ? fmtUsd(summary.totalAum, true) : "—"}
              </span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <h3 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] mb-4">Pool Allocation Breakdown</h3>
            {pools.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-[#99907c] py-6">
                {summary ? "No active strategy pools." : "Loading pools…"}
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
                        <p className="font-data-mono text-slate-900 dark:text-[#dce3f0]">{fmtUsd(pool.allocatedUsd, true)}</p>
                        <p className="text-xs text-slate-500 dark:text-[#d0c5af]">
                          {pool.allocatedPct}% actual • {pool.targetAllocationPct}% target
                        </p>
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
              <span className="text-slate-500 dark:text-[#d0c5af] font-data-mono mb-2 text-sm">across all pools</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 mt-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4af37] dark:bg-[#f2ca50] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, totalOpenTrades * 10)}%` }}
              />
            </div>
          </div>
          <div className={`${glassCard} p-6 flex-1`}>
            <p className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Investor Allocations</p>
            <div className="flex items-end justify-between mt-2">
              <span className="font-display-lg text-display-lg font-bold text-slate-900 dark:text-[#dce3f0]">
                {summary ? totalInvestorSlots : "—"}
              </span>
              <span className="text-slate-500 dark:text-[#d0c5af] font-data-mono mb-2 text-sm">funded positions</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-[#d0c5af] mt-4">
              Across {pools.length} active strategy pool{pools.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Liquidity Pools Table */}
        <div className={`col-span-12 ${glassCard} overflow-hidden`}>
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
            <h3 className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">Strategy Pools</h3>
            <button
              onClick={exportCSV}
              disabled={!summary}
              className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dce3f0] rounded font-label-caps hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-xs font-bold disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-transparent">
                  <th className="px-6 py-4 font-bold">Pool Name</th>
                  <th className="px-6 py-4 font-bold">Allocated Capital</th>
                  <th className="px-6 py-4 font-bold">Actual vs Target</th>
                  <th className="px-6 py-4 font-bold text-center">Investors</th>
                  <th className="px-6 py-4 font-bold text-center">Open Trades</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {pools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-[#99907c]">
                      {summary ? "No active strategy pools found." : "Loading…"}
                    </td>
                  </tr>
                ) : (
                  pools.map((pool) => {
                    const style = POOL_STYLE[pool.tagColor] ?? FALLBACK_STYLE;
                    const status = poolStatus(pool);
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
                        <td className="px-6 py-5">
                          <p className="font-data-mono text-slate-900 dark:text-[#dce3f0] font-semibold">{fmtUsd(pool.allocatedUsd)}</p>
                          <p className="text-[10px] text-slate-400 dark:text-[#d0c5af]">{pool.allocatedPct}% of AUM</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-32">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-bold uppercase">{pool.allocatedPct}%</span>
                              <span className="text-[10px] text-slate-400 dark:text-[#99907c]">→ {pool.targetAllocationPct}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                              <div className={`h-full ${style.bar} transition-all duration-700`} style={{ width: `${Math.min(100, pool.allocatedPct)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-data-mono text-slate-700 dark:text-[#dce3f0]">{pool.investorCount}</td>
                        <td className="px-6 py-5 text-center font-data-mono text-slate-700 dark:text-[#dce3f0]">{pool.openTrades}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold font-data-mono uppercase tracking-tighter ${STATUS_CLASSES[status]}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {status === "Off Target" ? (
                            <button
                              onClick={() => openModal(pool)}
                              className="bg-[#d4af37] dark:bg-[#f2ca50] px-4 py-1.5 rounded-lg text-white dark:text-[#3c2f00] font-bold text-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
                            >
                              Rebalance
                            </button>
                          ) : (
                            <button
                              onClick={() => openModal(pool)}
                              className="border border-[#d4af37] dark:border-[#f2ca50] text-[#d4af37] dark:text-[#f2ca50] px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-[#d4af37]/5 dark:hover:bg-[#f2ca50]/10 transition-all"
                            >
                              Rebalance
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Rebalance modal ────────────────────────────────────────────────── */}
      {selectedPool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 dark:bg-[#0d141d]/80 backdrop-blur-sm dark:backdrop-blur-md"
            onClick={() => !saving && setSelectedPool(null)}
          />
          <div className="bg-white dark:bg-[rgba(25,32,42,0.6)] dark:backdrop-blur-md relative w-full max-w-lg rounded-xl p-10 border-2 border-[#d4af37]/30 dark:border-[#f2ca50]/30 shadow-2xl dark:shadow-none">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#f2ca50]">Rebalance Target</h2>
                <p className="text-slate-500 dark:text-[#d0c5af] font-semibold">{selectedPool.name}</p>
              </div>
              <button
                className="text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => !saving && setSelectedPool(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] block mb-2">
                  TARGET ALLOCATION ADJUSTMENT
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="0" max="100" value={sliderVal}
                    onChange={(e) => setSliderVal(Number(e.target.value))}
                    className="flex-1 accent-[#d4af37] dark:accent-[#f2ca50] bg-slate-100 dark:bg-white/5 rounded-lg h-2"
                  />
                  <span className="font-data-mono text-[#d4af37] dark:text-[#f2ca50] font-bold text-lg w-12 text-right">{sliderVal}%</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">Actual Allocation</span>
                  <span className="font-data-mono text-slate-900 dark:text-[#dce3f0] font-bold">{selectedPool.allocatedPct}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">Current Target</span>
                  <span className="font-data-mono text-slate-900 dark:text-[#dce3f0] font-bold">{selectedPool.targetAllocationPct}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">New Target</span>
                  <span className="font-data-mono text-[#d4af37] dark:text-[#f2ca50] font-bold">{sliderVal}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">Allocated Capital</span>
                  <span className="font-data-mono text-slate-900 dark:text-[#dce3f0]">{fmtUsd(selectedPool.allocatedUsd)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 dark:text-[#99907c]">
                Targets across all active pools must sum to 100% or less. New investor
                allocations default to these targets.
              </p>

              {saveError && (
                <div className="bg-red-50 dark:bg-[#ffb4ab]/10 border border-red-200 dark:border-[#ffb4ab]/20 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-[#ffb4ab]">
                  {saveError}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedPool(null)}
                  disabled={saving}
                  className="flex-1 py-3 border border-slate-200 dark:border-white/10 rounded font-bold text-slate-700 dark:text-[#dce3f0] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRebalance}
                  disabled={saving || sliderVal === selectedPool.targetAllocationPct}
                  className="flex-1 py-3 bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] rounded font-bold hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                  {saving ? "Saving…" : "Execute Rebalance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
