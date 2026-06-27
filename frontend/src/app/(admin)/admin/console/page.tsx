"use client";

// Direct conversion of the Trading Console Terminal Stitch HTML.
// Sidebar + Navbar are provided by (admin)/layout.tsx — only the main canvas is here.
// Color token mappings:
//   secondary-container (#00a572 green) → text-[#00a572] / bg-[#00a572]
//   primary / primary-container (#d4af37 gold) → text-[#d4af37] / bg-[#d4af37]
//   on-primary (#3c2f00) → text-[#3c2f00]
//   error-container (dark red SHORT badge) → bg-red-800

import { useState, useEffect } from "react";

// ── Live server clock ──────────────────────────────────────────────────────────

function ServerClock() {
  const [time, setTime] = useState("15:42:01 GMT");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "GMT",
        }) + " GMT"
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <>{time}</>;
}

// ── Static log entries (matching Stitch) ──────────────────────────────────────

const INITIAL_LOGS = [
  {
    time: "15:42:01",
    color: "text-[#00a572]",
    prefix: "BROADCAST SUCCESS:",
    text: "Pushed active EUR/USD Long entry to 12,842 investor dashboards.",
  },
  {
    time: "15:38:55",
    color: "text-[#00a572]",
    prefix: "BROADCAST SUCCESS:",
    text: "Pushed active BTC/USDT Short entry to 12,842 investor dashboards.",
  },
  {
    time: "14:15:22",
    color: "text-[#d4af37]",
    prefix: "LEDGER UPDATE:",
    text: "Position XAU/USD closed at 2,355.80. Net yield distributed to all allocated liquidity wallets automatically.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TradingConsolePage() {
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Scrollable content area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">

        {/* Terminal header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-900 flex flex-wrap items-center gap-3">
                Trading Console Terminal
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 uppercase font-black">
                  Admin Override Active
                </span>
              </h2>
              <p className="text-[14px] text-slate-600 mt-1 max-w-2xl">
                Execute manual trade broadcasts across global investor nodes. Direct liquidity injection and
                platform ROI override controls.
              </p>
            </div>
            <div className="flex items-center gap-2 font-data-mono text-[12px] text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[16px] text-[#00a572]">schedule</span>
              Server Time: <ServerClock />
            </div>
          </div>
        </div>

        {/* ── Main 12-col grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-6 items-start">

          {/* ── LEFT column: form + active broadcasts ────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-6">

            {/* Broadcast form */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm border-l-4 border-l-[#d4af37]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">
                  Broadcast New Active Trade Position
                </h3>
                <span className="material-symbols-outlined text-slate-400">broadcast_on_personal</span>
              </div>

              <div className="space-y-6">

                {/* Asset Pair + Order Direction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Asset Pair
                    </label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 font-data-mono focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-colors outline-none">
                      <option>EUR/USD (Euro / US Dollar)</option>
                      <option>XAU/USD (Gold / US Dollar)</option>
                      <option>BTC/USD (Bitcoin / US Dollar)</option>
                      <option>GBP/JPY (Pound / Yen)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Order Direction
                    </label>
                    <div className="flex h-[46px] p-1 bg-slate-50 border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDirection("LONG")}
                        className={`flex-1 flex items-center justify-center gap-2 rounded text-[12px] font-bold transition-all ${
                          direction === "LONG"
                            ? "bg-[#00a572] text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          trending_up
                        </span>
                        LONG
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirection("SHORT")}
                        className={`flex-1 flex items-center justify-center gap-2 rounded text-[12px] font-bold transition-all ${
                          direction === "SHORT"
                            ? "bg-red-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">trending_down</span>
                        SHORT
                      </button>
                    </div>
                  </div>
                </div>

                {/* Leverage + Entry Price */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Leverage
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 font-data-mono focus:bg-white focus:ring-1 focus:ring-[#d4af37] transition-colors outline-none"
                        type="text"
                        defaultValue="1:100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]">
                        MAX
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Entry Price
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 font-data-mono focus:bg-white focus:ring-1 focus:ring-[#d4af37] transition-colors outline-none"
                        placeholder="1.08420"
                        step="0.0001"
                        type="number"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00a572] text-[12px] font-bold">
                        AUTO
                      </span>
                    </div>
                  </div>
                </div>

                {/* Take Profit + Stop Loss */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Take Profit (Target)
                    </label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 font-data-mono focus:bg-white focus:ring-1 focus:ring-[#d4af37] transition-colors outline-none"
                      placeholder="1.09200"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Stop Loss
                    </label>
                    <input
                      className="w-full bg-slate-50 border border-red-300/50 rounded-lg p-3 text-slate-900 font-data-mono focus:bg-white focus:ring-1 focus:ring-red-400/50 transition-colors outline-none"
                      placeholder="1.08100"
                      type="text"
                    />
                  </div>
                </div>

                {/* Broadcast button */}
                <div className="pt-2">
                  <button
                    type="button"
                    className="group w-full bg-[#d4af37] hover:bg-[#c9a830] text-[#3c2f00] font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-[rgba(212,175,55,0.2)]"
                  >
                    <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">
                      sync
                    </span>
                    BROADCAST ACTIVE TRADE &amp; SYNC LIVE
                  </button>
                </div>
              </div>
            </div>

            {/* Current Active Broadcasts table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">
                  Current Active Broadcasts
                </h3>
                <span className="text-[10px] font-bold text-[#00a572] bg-[#4edea3]/10 px-2 py-0.5 rounded">
                  LIVE SYNCING
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[540px]">
                  <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Asset Pair</th>
                      <th className="px-6 py-3">Direction</th>
                      <th className="px-6 py-3">Leverage</th>
                      <th className="px-6 py-3">Entry/Current</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[14px]">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">EUR/USD</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-[#00a572] text-white text-[10px] font-bold uppercase">
                          LONG
                        </span>
                      </td>
                      <td className="px-6 py-4 font-data-mono text-slate-600">1:100</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-500 text-[10px] uppercase font-bold">E: 1.0824</span>
                          <span className="text-[#00a572] font-data-mono font-bold">C: 1.0831</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
                          Pushing live data
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">BTC/USDT</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-red-800 text-white text-[10px] font-bold uppercase">
                          SHORT
                        </span>
                      </td>
                      <td className="px-6 py-4 font-data-mono text-slate-600">1:20</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-500 text-[10px] uppercase font-bold">E: 64,281.00</span>
                          <span className="text-red-500 font-data-mono font-bold">C: 64,310.20</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
                          Pushing live data
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── RIGHT column: settled trades, metrics, pool ───────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">

            {/* Settled / Closed Trades */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">
                  Settled/Closed Trades (24h)
                </h3>
                <span className="material-symbols-outlined text-slate-400 text-[18px]">history</span>
              </div>
              <div className="p-4 space-y-3">

                {/* XAU/USD — Profit */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 uppercase">XAU/USD (Gold)</p>
                      <p className="text-[10px] text-[#00a572] font-bold">LONG POSITION</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#4edea3]/10 text-[#00a572] text-[11px] font-black">
                      +$14.60 PROFIT
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-data-mono mb-3">
                    <div className="flex justify-between border-r border-slate-200 pr-2">
                      <span className="text-slate-500">ENTRY</span>
                      <span className="text-slate-700">2,341.20</span>
                    </div>
                    <div className="flex justify-between pl-1">
                      <span className="text-slate-500">EXIT</span>
                      <span className="text-slate-700 font-bold">2,355.80</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-1.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:text-[#d4af37] hover:border-[#d4af37] transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">archive</span>
                    Archived to User History
                  </button>
                </div>

                {/* OIL/USD — Loss */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 uppercase">OIL/USD</p>
                      <p className="text-[10px] text-red-400 font-bold">SHORT POSITION</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-[11px] font-black">
                      -$0.07 LOSS
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-data-mono mb-3">
                    <div className="flex justify-between border-r border-slate-200 pr-2">
                      <span className="text-slate-500">ENTRY</span>
                      <span className="text-slate-700">78.45</span>
                    </div>
                    <div className="flex justify-between pl-1">
                      <span className="text-slate-500">EXIT</span>
                      <span className="text-slate-700 font-bold">78.52</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-1.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:text-[#d4af37] hover:border-[#d4af37] transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">archive</span>
                    Archived to User History
                  </button>
                </div>
              </div>
            </div>

            {/* Global Metrics Override */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">
                  Global Metrics Override
                </h3>
                <span className="material-symbols-outlined text-slate-400">tune</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#4edea3]/10 rounded">
                      <span className="material-symbols-outlined text-[#00a572] text-[20px]">percent</span>
                    </div>
                    <span className="text-[14px] font-bold text-slate-700">Platform ROI %</span>
                  </div>
                  <input
                    className="w-20 bg-transparent text-right font-data-mono text-[#d4af37] font-bold outline-none"
                    type="text"
                    defaultValue="12.4"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#d4af37]/10 rounded">
                      <span className="material-symbols-outlined text-[#d4af37] text-[20px]">speed</span>
                    </div>
                    <span className="text-[14px] font-bold text-slate-700">Execution Latency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-16 bg-transparent text-right font-data-mono text-[#d4af37] font-bold outline-none"
                      type="text"
                      defaultValue="142"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">MS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pool Allocations */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">
                  Pool Allocations
                </h3>
                <span className="material-symbols-outlined text-slate-400">pie_chart</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                      <span className="text-slate-500">Forex Core</span>
                      <span className="text-slate-900">40%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#d4af37] w-[40%]" />
                    </div>
                  </div>
                  <div className="w-20">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 text-center font-data-mono text-[12px] text-slate-900 outline-none focus:ring-1 focus:ring-[#d4af37]"
                      type="text"
                      defaultValue="40"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                      <span className="text-slate-500">Commodities</span>
                      <span className="text-slate-900">30%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#00a572] w-[30%]" />
                    </div>
                  </div>
                  <div className="w-20">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 text-center font-data-mono text-[12px] text-slate-900 outline-none focus:ring-1 focus:ring-[#d4af37]"
                      type="text"
                      defaultValue="30"
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="w-full mt-6 py-2 border border-slate-200 text-[11px] font-bold tracking-widest text-slate-600 hover:bg-slate-50 transition-colors rounded uppercase"
              >
                Update Weights
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── System log feed footer ────────────────────────────────────────── */}
      <div className="shrink-0 h-28 bg-white border-t border-slate-200 px-4 sm:px-8 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00a572] rounded-full animate-pulse" />
            Recent Broadcast Terminal Logs
          </h4>
          <span className="text-[10px] font-data-mono text-slate-400">
            Terminal Session ID: TRX-992-KLA
          </span>
        </div>
        <div className="bg-slate-50 rounded p-2 h-16 overflow-y-auto border border-slate-100">
          <div className="space-y-1 font-data-mono text-[11px] text-slate-700">
            {INITIAL_LOGS.map((log, i) => (
              <p key={i}>
                <span className={`${log.color} font-bold`}>[{log.time}]</span>{" "}
                <span className="font-bold text-slate-900">{log.prefix}</span>{" "}
                {log.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
