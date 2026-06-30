"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/src/lib/constants/routes";

type Pool = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  pair: string;
  liquidity: string;
  liquidityDetail: string;
  utilPct: number;
  barColor: string;
  status: "Critical" | "Normal" | "Low";
};

const POOLS: Pool[] = [
  {
    id: "nexus",    name: "Nexus Alpha",   subtitle: "Core Clearing Pool",       icon: "bolt",          iconBg: "bg-[#d4af37]/10 dark:bg-[#f2ca50]/10", iconColor: "text-[#d4af37] dark:text-[#f2ca50]",
    pair: "BTC / USDC",  liquidity: "$450,230,000", liquidityDetail: "7,500 BTC • 250M USDC",  utilPct: 82, barColor: "bg-[#d4af37] dark:bg-[#f2ca50]",                  status: "Critical",
  },
  {
    id: "flow",     name: "Flow Stable",   subtitle: "Cross-Chain Yield",        icon: "waves",         iconBg: "bg-emerald-50 dark:bg-[#4edea3]/10",    iconColor: "text-emerald-600 dark:text-[#4edea3]",
    pair: "USDT / USDC", liquidity: "$280,000,000", liquidityDetail: "140M USDT • 140M USDC", utilPct: 45, barColor: "bg-emerald-500 dark:bg-[#4edea3]",                 status: "Normal",
  },
  {
    id: "ethos",    name: "Ethos Vault",   subtitle: "Arbitrage Optimization",   icon: "filter_drama",  iconBg: "bg-rose-50 dark:bg-[#ffbec1]/10",       iconColor: "text-rose-600 dark:text-[#ffbec1]",
    pair: "ETH / USDT",  liquidity: "$310,500,000", liquidityDetail: "120K ETH • 100M USDT",  utilPct: 12, barColor: "bg-rose-500 dark:bg-[#4edea3]",                    status: "Low",
  },
  {
    id: "infinity", name: "Infinity Loop", subtitle: "Layer 2 Integration",      icon: "all_inclusive", iconBg: "bg-[#d4af37]/10 dark:bg-[#f2ca50]/10", iconColor: "text-[#d4af37] dark:text-[#f2ca50]",
    pair: "BTC / ETH",   liquidity: "$198,000,000", liquidityDetail: "2,100 BTC • 45K ETH",   utilPct: 58, barColor: "bg-emerald-500 dark:bg-[#4edea3]",                 status: "Normal",
  },
];

const STATUS_CLASSES: Record<Pool["status"], string> = {
  Critical: "bg-red-100 dark:bg-[#ffb4ab]/10 text-red-700 dark:text-[#ffb4ab] border border-red-200 dark:border-[#ffb4ab]/20",
  Normal:   "bg-emerald-100 dark:bg-[#4edea3]/10 text-emerald-700 dark:text-[#4edea3] border border-emerald-200 dark:border-[#4edea3]/20",
  Low:      "bg-slate-100 dark:bg-[#ffb4ab]/10 text-slate-700 dark:text-[#ffb4ab] border border-slate-200 dark:border-[#ffb4ab]/20",
};

export default function AssetLiquidityPage() {
  const router = useRouter();
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [sliderVal, setSliderVal]       = useState(82);
  const [rebalanced, setRebalanced]     = useState<Set<string>>(new Set());
  const [pools, setPools]               = useState<Pool[]>(POOLS);

  const glassCard =
    "glass-card rounded-xl bg-white dark:bg-[rgba(25,32,42,0.6)] dark:backdrop-blur-md dark:border dark:border-[rgba(255,255,255,0.1)]";

  function openModal(pool: Pool) {
    setSelectedPool(pool);
    setSliderVal(pool.utilPct);
  }

  function executeRebalance() {
    if (!selectedPool) return;
    setPools((prev) =>
      prev.map((p) =>
        p.id === selectedPool.id ? { ...p, utilPct: sliderVal, status: sliderVal > 75 ? "Critical" : sliderVal < 20 ? "Low" : "Normal" } : p
      )
    );
    setRebalanced((prev) => new Set([...prev, selectedPool.id]));
    setSelectedPool(null);
  }

  function exportCSV() {
    const rows = ["Pool,Pair,Liquidity,Utilization,Status",
      ...pools.map((p) => `${p.name},${p.pair},${p.liquidity},${p.utilPct}%,${p.status}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "liquidity_pools.csv"; a.click();
  }

  function globalRebalance() {
    setPools((prev) => prev.map((p) => ({ ...p, utilPct: Math.round(p.utilPct * 0.85), status: "Normal" as const })));
    setRebalanced(new Set(pools.map((p) => p.id)));
  }

  return (
    <div className="px-4 sm:p-6 pt-6 bg-slate-50 dark:bg-[#050b14] h-full overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-slate-900 dark:text-[#dce3f0]">Asset Liquidity</h2>
          <p className="text-slate-600 dark:text-[#d0c5af] font-body-md text-body-md">
            Real-time health monitoring of platform-wide institutional liquidity.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-[#19202a] px-3 py-1.5 rounded border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <span className="w-2 h-2 bg-emerald-500 dark:bg-[#4edea3] rounded-full animate-pulse" />
            <span className="text-sm font-data-mono text-emerald-600 dark:text-[#4edea3] font-semibold">System: Healthy</span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-[#19202a] px-3 py-1.5 rounded border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <span className="text-sm font-data-mono text-slate-500 dark:text-[#d0c5af]">Update: 12s ago</span>
          </div>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Total Liquidity Breakdown */}
        <div className={`col-span-12 lg:col-span-8 ${glassCard} p-6 flex flex-col md:flex-row items-center gap-10`}>
          <div className="relative w-64 h-64 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f1f5f9" className="dark:[stroke:rgba(255,255,255,0.05)]" strokeWidth="12" />
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#d4af37" className="dark:[stroke:#f2ca50]" strokeDasharray="251.2" strokeDashoffset="62.8" strokeWidth="12" />
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#10b981" className="dark:[stroke:#4edea3]" strokeDasharray="251.2" strokeDashoffset="150.72" strokeWidth="12" transform="rotate(75 50 50)" />
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f43f5e" className="dark:[stroke:#ffbec1]" strokeDasharray="251.2" strokeDashoffset="200.96" strokeWidth="12" transform="rotate(210 50 50)" />
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#64748b" className="dark:[stroke:#dce3f0]" strokeDasharray="251.2" strokeDashoffset="226.08" strokeWidth="12" transform="rotate(282 50 50)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Total Value</span>
              <span className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">$1.24B</span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <h3 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] mb-4">Asset Allocation Breakdown</h3>
            <div className="space-y-4">
              {[
                { dot: "bg-[#d4af37] dark:bg-[#f2ca50]", label: "Bitcoin (BTC)",   mono: "420,124.50", sub: "33.8% • $418.5M" },
                { dot: "bg-emerald-500 dark:bg-[#4edea3]", label: "Ethereum (ETH)", mono: "1.2M",       sub: "24.2% • $299.8M" },
                { dot: "bg-rose-500 dark:bg-[#ffbec1]",    label: "Tether (USDT)",  mono: "254M",       sub: "20.5% • $254.1M" },
                { dot: "bg-slate-500 dark:bg-[#dce3f0]",   label: "USD Coin (USDC)",mono: "267.6M",     sub: "21.5% • $267.6M" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${row.dot}`} />
                    <span className="font-body-md text-body-md text-slate-700 dark:text-[#dce3f0] font-semibold">{row.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-data-mono text-slate-900 dark:text-[#dce3f0]">{row.mono}</p>
                    <p className="text-xs text-slate-500 dark:text-[#d0c5af]">{row.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className={`${glassCard} p-6 flex-1`}>
            <p className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Avg Utilization</p>
            <div className="flex items-end justify-between mt-2">
              <span className="font-display-lg text-display-lg font-bold text-slate-900 dark:text-[#f2ca50]">
                {Math.round(pools.reduce((s, p) => s + p.utilPct, 0) / pools.length)}%
              </span>
              <span className="text-emerald-600 dark:text-[#4edea3] font-data-mono mb-2 font-bold">
                +2.4% <span className="material-symbols-outlined text-sm align-middle">trending_up</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 mt-4 rounded-full overflow-hidden">
              <div className="h-full bg-[#d4af37] dark:bg-[#f2ca50] rounded-full transition-all duration-500"
                style={{ width: `${Math.round(pools.reduce((s, p) => s + p.utilPct, 0) / pools.length)}%` }} />
            </div>
          </div>
          <div className={`${glassCard} p-6 flex-1`}>
            <p className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af]">Total 24h Volume</p>
            <div className="flex items-end justify-between mt-2">
              <span className="font-display-lg text-display-lg font-bold text-slate-900 dark:text-[#dce3f0]">$4.82B</span>
              <span className="text-slate-500 dark:text-[#d0c5af] font-data-mono mb-2 text-sm">Institutional</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-[#d0c5af] mt-4">Across 12 interconnected smart pools</p>
          </div>
        </div>

        {/* Liquidity Pools Table */}
        <div className={`col-span-12 ${glassCard} overflow-hidden`}>
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
            <h3 className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">Liquidity Pools</h3>
            <div className="flex gap-2">
              <button onClick={exportCSV}
                className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dce3f0] rounded font-label-caps hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-xs font-bold">
                Export CSV
              </button>
              <button onClick={globalRebalance}
                className="px-4 py-2 bg-[#d4af37]/10 dark:bg-[#f2ca50]/20 text-[#d4af37] dark:text-[#f2ca50] border border-[#d4af37]/20 dark:border-[#f2ca50]/30 rounded font-label-caps hover:bg-[#d4af37]/20 dark:hover:bg-[#f2ca50]/30 transition-colors text-xs font-bold">
                Global Rebalance
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-transparent">
                  <th className="px-6 py-4 font-bold">Pool Name</th>
                  <th className="px-6 py-4 font-bold">Asset Pair</th>
                  <th className="px-6 py-4 font-bold">Total Liquidity</th>
                  <th className="px-6 py-4 font-bold">Utilization</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {pools.map((pool) => (
                  <tr key={pool.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${pool.iconBg} flex items-center justify-center ${pool.iconColor}`}>
                          <span className="material-symbols-outlined">{pool.icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-[#dce3f0]">{pool.name}</p>
                          <p className="text-xs text-slate-500 dark:text-[#d0c5af]">{pool.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-data-mono text-slate-700 dark:text-[#dce3f0]">{pool.pair}</td>
                    <td className="px-6 py-5">
                      <p className="font-data-mono text-slate-900 dark:text-[#dce3f0] font-semibold">{pool.liquidity}</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#d0c5af]">{pool.liquidityDetail}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="w-32">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-bold uppercase">{pool.utilPct}%</span>
                          {rebalanced.has(pool.id) && (
                            <span className="text-[10px] text-[#4edea3] font-bold">↓ rebalanced</span>
                          )}
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${pool.barColor} transition-all duration-700`} style={{ width: `${pool.utilPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold font-data-mono uppercase tracking-tighter ${STATUS_CLASSES[pool.status]}`}>
                        {pool.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {pool.status === "Critical" ? (
                        <button onClick={() => openModal(pool)}
                          className="bg-[#d4af37] dark:bg-[#f2ca50] px-4 py-1.5 rounded-lg text-white dark:text-[#3c2f00] font-bold text-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all">
                          Rebalance
                        </button>
                      ) : (
                        <button onClick={() => openModal(pool)}
                          className="border border-[#d4af37] dark:border-[#f2ca50] text-[#d4af37] dark:text-[#f2ca50] px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-[#d4af37]/5 dark:hover:bg-[#f2ca50]/10 transition-all">
                          Rebalance
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Rebalance modal ────────────────────────────────────────────────── */}
      {selectedPool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-[#0d141d]/80 backdrop-blur-sm dark:backdrop-blur-md"
            onClick={() => setSelectedPool(null)} />
          <div className="bg-white dark:bg-[rgba(25,32,42,0.6)] dark:backdrop-blur-md relative w-full max-w-lg rounded-xl p-10 border-2 border-[#d4af37]/30 dark:border-[#f2ca50]/30 shadow-2xl dark:shadow-none">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#f2ca50]">Rebalance Request</h2>
                <p className="text-slate-500 dark:text-[#d0c5af] font-semibold">{selectedPool.name} ({selectedPool.pair})</p>
              </div>
              <button className="text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => setSelectedPool(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] block mb-2">
                  TARGET UTILIZATION ADJUSTMENT
                </label>
                <div className="flex items-center gap-4">
                  <input type="range" min="0" max="100" value={sliderVal}
                    onChange={(e) => setSliderVal(Number(e.target.value))}
                    className="flex-1 accent-[#d4af37] dark:accent-[#f2ca50] bg-slate-100 dark:bg-white/5 rounded-lg h-2" />
                  <span className="font-data-mono text-[#d4af37] dark:text-[#f2ca50] font-bold text-lg w-12 text-right">{sliderVal}%</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">Current Utilization</span>
                  <span className="font-data-mono text-red-600 dark:text-[#ffb4ab] font-bold">{selectedPool.utilPct}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">Target Utilization</span>
                  <span className="font-data-mono text-slate-900 dark:text-[#dce3f0] font-bold">{sliderVal}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">Est. Slippage</span>
                  <span className="font-data-mono text-slate-900 dark:text-[#dce3f0]">0.002%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-[#d0c5af] font-medium">Network Fee</span>
                  <span className="font-data-mono text-slate-900 dark:text-[#dce3f0]">$1,240.40</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setSelectedPool(null)}
                  className="flex-1 py-3 border border-slate-200 dark:border-white/10 rounded font-bold text-slate-700 dark:text-[#dce3f0] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button onClick={executeRebalance}
                  className="flex-1 py-3 bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] rounded font-bold hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] shadow-lg transition-all active:scale-95">
                  Execute Rebalance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
