"use client";

// Direct conversion of the Asset Liquidity Stitch HTML.
// Sidebar + Navbar are in (admin)/layout.tsx — only <main> canvas here.
// Spacing token map: p-lg→p-6, mb-xl→mb-10, mb-lg→mb-6, mb-md→mb-4,
//   gap-lg→gap-6, gap-xl→gap-10, px-lg→px-6, py-md→py-4, p-md→p-4.
// Color token map: primary=#d4af37 (gold), secondary=#059669 (emerald-600).
// Typography classes (font-headline-lg, text-headline-lg, font-data-mono, etc.)
//   are defined in globals.css @layer utilities to match Stitch fontSize config.

import { useState } from "react";

export default function AssetLiquidityPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">

      {/* ── Dashboard header ─────────────────────────────────────────────── */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-slate-900">Asset Liquidity</h2>
          <p className="text-slate-600 font-body-md text-body-md">
            Real-time health monitoring of platform-wide institutional liquidity.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-data-mono text-emerald-600 font-semibold">System: Healthy</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm">
            <span className="text-sm font-data-mono text-slate-500">Update: 12s ago</span>
          </div>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Total Liquidity Breakdown */}
        <div className="col-span-12 lg:col-span-8 glass-card rounded-xl p-6 flex flex-col md:flex-row items-center gap-10 bg-white">

          {/* Donut chart */}
          <div className="relative w-64 h-64 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f1f5f9" strokeWidth="12" />
              {/* BTC (Gold) */}
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#d4af37" strokeDasharray="251.2" strokeDashoffset="62.8" strokeWidth="12" />
              {/* ETH (Green) */}
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#10b981" strokeDasharray="251.2" strokeDashoffset="150.72" strokeWidth="12" transform="rotate(75 50 50)" />
              {/* USDT (Pink) */}
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f43f5e" strokeDasharray="251.2" strokeDashoffset="200.96" strokeWidth="12" transform="rotate(210 50 50)" />
              {/* USDC (Slate) */}
              <circle cx="50" cy="50" fill="transparent" r="40" stroke="#64748b" strokeDasharray="251.2" strokeDashoffset="226.08" strokeWidth="12" transform="rotate(282 50 50)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-label-caps text-label-caps text-slate-500">Total Value</span>
              <span className="font-headline-md text-headline-md font-bold text-slate-900">$1.24B</span>
            </div>
          </div>

          {/* Breakdown list */}
          <div className="flex-1 w-full">
            <h3 className="font-label-caps text-label-caps text-slate-500 mb-4">Asset Allocation Breakdown</h3>
            <div className="space-y-4">

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#d4af37]" />
                  <span className="font-body-md text-body-md text-slate-700 font-semibold">Bitcoin (BTC)</span>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-slate-900">420,124.50</p>
                  <p className="text-xs text-slate-500">33.8% • $418.5M</p>
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="font-body-md text-body-md text-slate-700 font-semibold">Ethereum (ETH)</span>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-slate-900">1.2M</p>
                  <p className="text-xs text-slate-500">24.2% • $299.8M</p>
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="font-body-md text-body-md text-slate-700 font-semibold">Tether (USDT)</span>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-slate-900">254M</p>
                  <p className="text-xs text-slate-500">20.5% • $254.1M</p>
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="font-body-md text-body-md text-slate-700 font-semibold">USD Coin (USDC)</span>
                </div>
                <div className="text-right">
                  <p className="font-data-mono text-slate-900">267.6M</p>
                  <p className="text-xs text-slate-500">21.5% • $267.6M</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Key Metrics column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

          {/* Avg Utilization */}
          <div className="glass-card rounded-xl p-6 flex-1 bg-white">
            <p className="font-label-caps text-label-caps text-slate-500">Avg Utilization</p>
            <div className="flex items-end justify-between mt-2">
              <span className="font-display-lg text-display-lg font-bold text-slate-900">64.2%</span>
              <span className="text-emerald-600 font-data-mono mb-2 font-bold">
                +2.4%{" "}
                <span className="material-symbols-outlined text-sm align-middle">trending_up</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
              <div className="h-full bg-[#d4af37] rounded-full" style={{ width: "64.2%" }} />
            </div>
          </div>

          {/* Total 24h Volume */}
          <div className="glass-card rounded-xl p-6 flex-1 bg-white">
            <p className="font-label-caps text-label-caps text-slate-500">Total 24h Volume</p>
            <div className="flex items-end justify-between mt-2">
              <span className="font-display-lg text-display-lg font-bold text-slate-900">$4.82B</span>
              <span className="text-slate-500 font-data-mono mb-2 text-sm">Institutional</span>
            </div>
            <p className="text-xs text-slate-400 mt-4">Across 12 interconnected smart pools</p>
          </div>
        </div>

        {/* ── Liquidity Pools table ───────────────────────────────────────── */}
        <div className="col-span-12 glass-card rounded-xl overflow-hidden bg-white">

          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-headline-md text-headline-md font-bold text-slate-900">Liquidity Pools</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded font-label-caps hover:bg-slate-50 transition-colors text-xs font-bold">
                Export CSV
              </button>
              <button className="px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 rounded font-label-caps hover:bg-[#d4af37]/20 transition-colors text-xs font-bold">
                Global Rebalance
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="font-label-caps text-label-caps text-slate-500 border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-4 font-bold">Pool Name</th>
                  <th className="px-6 py-4 font-bold">Asset Pair</th>
                  <th className="px-6 py-4 font-bold">Total Liquidity</th>
                  <th className="px-6 py-4 font-bold">Utilization</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">

                {/* Nexus Alpha — Critical */}
                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37]">
                        <span className="material-symbols-outlined">bolt</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Nexus Alpha</p>
                        <p className="text-xs text-slate-500">Core Clearing Pool</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-data-mono text-slate-700">BTC / USDC</td>
                  <td className="px-6 py-5">
                    <p className="font-data-mono text-slate-900 font-semibold">$450,230,000</p>
                    <p className="text-[10px] text-slate-400">7,500 BTC • 250M USDC</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-32">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">82%</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#d4af37]" style={{ width: "82%" }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2 py-1 rounded text-[10px] font-bold font-data-mono uppercase tracking-tighter bg-red-100 text-red-700 border border-red-200">
                      Critical
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => setModalOpen(true)}
                      className="bg-[#d4af37] px-4 py-1.5 rounded-lg text-white font-bold text-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
                    >
                      Rebalance
                    </button>
                  </td>
                </tr>

                {/* Flow Stable — Normal */}
                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined">waves</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Flow Stable</p>
                        <p className="text-xs text-slate-500">Cross-Chain Yield</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-data-mono text-slate-700">USDT / USDC</td>
                  <td className="px-6 py-5">
                    <p className="font-data-mono text-slate-900 font-semibold">$280,000,000</p>
                    <p className="text-[10px] text-slate-400">140M USDT • 140M USDC</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-32">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">45%</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: "45%" }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2 py-1 rounded text-[10px] font-bold font-data-mono uppercase tracking-tighter bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Normal
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => setModalOpen(true)}
                      className="border border-[#d4af37] text-[#d4af37] px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-[#d4af37]/5 transition-all"
                    >
                      Rebalance
                    </button>
                  </td>
                </tr>

                {/* Ethos Vault — Low */}
                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                        <span className="material-symbols-outlined">filter_drama</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Ethos Vault</p>
                        <p className="text-xs text-slate-500">Arbitrage Optimization</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-data-mono text-slate-700">ETH / USDT</td>
                  <td className="px-6 py-5">
                    <p className="font-data-mono text-slate-900 font-semibold">$310,500,000</p>
                    <p className="text-[10px] text-slate-400">120K ETH • 100M USDT</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-32">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">12%</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: "12%" }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2 py-1 rounded text-[10px] font-bold font-data-mono uppercase tracking-tighter bg-slate-100 text-slate-700 border border-slate-200">
                      Low
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => setModalOpen(true)}
                      className="border border-[#d4af37] text-[#d4af37] px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-[#d4af37]/5 transition-all"
                    >
                      Rebalance
                    </button>
                  </td>
                </tr>

                {/* Infinity Loop — Normal */}
                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37]">
                        <span className="material-symbols-outlined">all_inclusive</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Infinity Loop</p>
                        <p className="text-xs text-slate-500">Layer 2 Integration</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-data-mono text-slate-700">BTC / ETH</td>
                  <td className="px-6 py-5">
                    <p className="font-data-mono text-slate-900 font-semibold">$198,000,000</p>
                    <p className="text-[10px] text-slate-400">2,100 BTC • 45K ETH</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-32">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">58%</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: "58%" }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2 py-1 rounded text-[10px] font-bold font-data-mono uppercase tracking-tighter bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Normal
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => setModalOpen(true)}
                      className="border border-[#d4af37] text-[#d4af37] px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-[#d4af37]/5 transition-all"
                    >
                      Rebalance
                    </button>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Rebalance modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="bg-white relative w-full max-w-lg rounded-xl p-10 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-slate-900">
                  Rebalance Request
                </h2>
                <p className="text-slate-500 font-semibold">Nexus Alpha Pool (BTC/USDC)</p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-900 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="font-label-caps text-label-caps text-slate-500 block mb-2">
                  TARGET LIQUIDITY ADJUSTMENT
                </label>
                <div className="flex items-center gap-4">
                  <input
                    className="flex-1 accent-[#d4af37] bg-slate-100 rounded-lg h-2"
                    max="100"
                    min="0"
                    type="range"
                    defaultValue="82"
                  />
                  <span className="font-data-mono text-[#d4af37] font-bold text-lg">82%</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Current Skew</span>
                  <span className="font-data-mono text-red-600 font-bold">Heavy BTC (72/28)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Est. Slippage</span>
                  <span className="font-data-mono text-slate-900">0.002%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Network Fee</span>
                  <span className="font-data-mono text-slate-900">$1,240.40</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  className="flex-1 py-3 border border-slate-200 rounded font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-3 bg-[#d4af37] text-white rounded font-bold hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] shadow-lg transition-all active:scale-95"
                  onClick={() => {
                    alert("Rebalancing sequence initiated. Signature required on cold wallet.");
                    setModalOpen(false);
                  }}
                >
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
