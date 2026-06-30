"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";

// ── Live server clock ──────────────────────────────────────────────────────────
function ServerClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "GMT",
        }) + " GMT"
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <>{time}</>;
}

// ── Stitch dark tokens (explicit) ─────────────────────────────────────────────
// background:              #0d141d
// surface-container-lowest:#080f18  ← input bg
// surface-container:       #19202a  ← server-time box, some bg
// surface-container-high:  #242a34  ← row hover, button hover
// surface-container-highest:#2e353f ← pool track
// outline-variant:         #4d4635  ← input borders
// outline:                 #99907c  ← label / muted text
// on-surface:              #dce3f0  ← main text
// on-surface-variant:      #d0c5af  ← secondary text
// primary:                 #f2ca50 / primary-container: #d4af37
// secondary:               #4edea3
// error:                   #ffb4ab
// tertiary:                #ffbec1
// glass-panel:             rgba(13,20,29,0.7) + blur(12px) + border rgba(255,255,255,0.1)

// ── Mock asset prices ──────────────────────────────────────────────────────────
const ASSET_DATA: Record<string, { entry: string; tp: string; sl: string; leverage: string }> = {
  "EUR/USD": { entry: "1.08420",   tp: "1.09200",   sl: "1.07800",   leverage: "1:100" },
  "XAU/USD": { entry: "2341.20",   tp: "2380.00",   sl: "2310.00",   leverage: "1:50"  },
  "BTC/USD": { entry: "64281.00",  tp: "67000.00",  sl: "62000.00",  leverage: "1:20"  },
  "GBP/JPY": { entry: "192.340",   tp: "194.500",   sl: "190.200",   leverage: "1:100" },
};

// ── Types ──────────────────────────────────────────────────────────────────────
type Broadcast = {
  id: number; asset: string; direction: "LONG" | "SHORT";
  leverage: string; entry: string; current: string; pnl: number;
};
type Settled = {
  id: number; asset: string; direction: "LONG" | "SHORT";
  entry: string; exit: string; pnl: number; archived: boolean;
};
type Pool = { name: string; pct: number; color: string };
type LogEntry = { time: string; color: string; text: string };

const INITIAL_BROADCASTS: Broadcast[] = [
  { id: 1, asset: "EUR/USD",  direction: "LONG",  leverage: "1:100", entry: "1.0824",    current: "1.0831",    pnl: +0.065 },
  { id: 2, asset: "BTC/USDT", direction: "SHORT", leverage: "1:20",  entry: "64,281.00", current: "64,310.20", pnl: -0.045 },
];
const INITIAL_SETTLED: Settled[] = [
  { id: 1, asset: "XAU/USD (Gold)", direction: "LONG",  entry: "2,341.20", exit: "2,355.80", pnl: +14.60, archived: false },
  { id: 2, asset: "OIL/USD",        direction: "SHORT", entry: "78.45",    exit: "78.52",    pnl: -0.07,  archived: false },
];
const INITIAL_POOLS: Pool[] = [
  { name: "Forex Core",     pct: 40, color: "bg-[#d4af37]" },
  { name: "Commodities",    pct: 30, color: "bg-[#4edea3]" },
  { name: "Volatility Idx", pct: 30, color: "bg-[#ffbec1]" },
];
const MOCK_LOG_LINES = [
  "User validation completed for Node Group-A (APAC Region).",
  "Broadcast latency optimized to 142ms across all segments.",
  "Syncing real-time market data with terminal execution engine...",
  "Protocol ASC-78345 authentication handshake success.",
  "Liquidity verification completed for Node Cluster-4 (London/Frankfurt).",
];

function makeLog(text: string, color = "text-[#4edea3]"): LogEntry {
  return {
    time: new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "GMT",
    }),
    color,
    text,
  };
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg =
    type === "success" ? "bg-[#4edea3] text-[#003824]" :
    type === "error"   ? "bg-[#ffb4ab] text-[#690005]" :
                         "bg-[#d4af37] text-[#3c2f00]";
  return (
    <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl font-bold text-[13px] ${bg} animate-in slide-in-from-bottom-4 duration-300`}>
      {msg}
      <button onClick={onClose}><X className="size-3.5" /></button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TradingConsolePage() {
  const [asset, setAsset]           = useState("EUR/USD");
  const [direction, setDirection]   = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage]     = useState(ASSET_DATA["EUR/USD"].leverage);
  const [entry, setEntry]           = useState(ASSET_DATA["EUR/USD"].entry);
  const [tp, setTp]                 = useState(ASSET_DATA["EUR/USD"].tp);
  const [sl, setSl]                 = useState(ASSET_DATA["EUR/USD"].sl);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(INITIAL_BROADCASTS);
  const [settled, setSettled]       = useState<Settled[]>(INITIAL_SETTLED);
  const [roi, setRoi]               = useState("12.4");
  const [latency, setLatency]       = useState("142");
  const [drawdown, setDrawdown]     = useState("2.8");
  const [pools, setPools]           = useState<Pool[]>(INITIAL_POOLS);
  const [logs, setLogs]             = useState<LogEntry[]>([
    makeLog("Pushed Active Position EUR/USD Long to 12,842 user nodes successfully.", "text-[#4edea3]"),
    makeLog("Global ROI recalibration broadcast initiated by Alexander V. (+0.4%).", "text-[#d4af37]"),
    makeLog("Liquidity verification completed for Node Cluster-4 (London/Frankfurt).", "text-[#4edea3]"),
  ]);
  const [logOpen, setLogOpen]       = useState(true);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const nextId = useRef(100);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") =>
    setToast({ msg, type });

  useEffect(() => {
    const id = setInterval(() => {
      const text = MOCK_LOG_LINES[Math.floor(Math.random() * MOCK_LOG_LINES.length)];
      setLogs((prev) => [makeLog(text), ...prev.slice(0, 7)]);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  function handleAssetChange(val: string) {
    setAsset(val);
    const d = ASSET_DATA[val];
    if (d) { setLeverage(d.leverage); setEntry(d.entry); setTp(d.tp); setSl(d.sl); }
  }

  function handleBroadcast() {
    if (!entry || !tp || !sl) {
      showToast("Fill in Entry, Take Profit and Stop Loss.", "error");
      return;
    }
    setBroadcasting(true);
    setTimeout(() => {
      const id = nextId.current++;
      setBroadcasts((prev) => [{ id, asset, direction, leverage, entry, current: entry, pnl: 0 }, ...prev]);
      setLogs((prev) => [
        makeLog(`Pushed Active Position ${asset} ${direction} to 12,842 user nodes successfully.`, "text-[#4edea3]"),
        ...prev.slice(0, 7),
      ]);
      setBroadcasting(false);
      showToast(`${asset} ${direction} broadcast to 12,842 nodes.`, "success");
    }, 1800);
  }

  function handleTerminate(id: number, assetName: string) {
    setBroadcasts((prev) => prev.filter((b) => b.id !== id));
    setLogs((prev) => [makeLog(`Position ${assetName} manually terminated by admin.`, "text-[#ffb4ab]"), ...prev.slice(0, 7)]);
    showToast(`${assetName} position terminated.`, "info");
  }

  function handleArchive(id: number) {
    setSettled((prev) => prev.map((s) => s.id === id ? { ...s, archived: true } : s));
    showToast("Trade archived to investor history.", "info");
  }

  function adjustPool(idx: number, delta: number) {
    setPools((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], pct: Math.max(0, Math.min(100, next[idx].pct + delta)) };
      return next;
    });
  }

  function handleMetricsApply() {
    setLogs((prev) => [
      makeLog(`Global ROI set to ${roi}%, Latency ${latency}ms, Drawdown ${drawdown}% by admin.`, "text-[#d4af37]"),
      ...prev.slice(0, 7),
    ]);
    showToast("Global metrics updated and broadcast.", "success");
  }

  function handlePoolUpdate() {
    const total = pools.reduce((s, p) => s + p.pct, 0);
    if (total !== 100) { showToast(`Allocations must sum to 100% (currently ${total}%).`, "error"); return; }
    setLogs((prev) => [
      makeLog(`Pool allocations updated: ${pools.map((p) => `${p.name} ${p.pct}%`).join(", ")}.`, "text-[#d4af37]"),
      ...prev.slice(0, 7),
    ]);
    showToast("Pool weights updated across all nodes.", "success");
  }

  // ── Shared dark-mode class strings (exact stitch tokens) ──────────────────
  // card = glass-panel style
  const card  = "bg-white dark:bg-[rgba(25,32,42,0.4)] dark:backdrop-blur-md rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.08)] shadow-sm dark:shadow-none";
  // input fields
  const input = "w-full bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg p-3 text-slate-900 dark:text-[#dce3f0] font-data-mono focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-colors";
  // field labels
  const label = "text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-wider";
  // metric row container
  const metricRow = "flex items-center justify-between p-3 bg-slate-50 dark:bg-[#080f18] rounded-lg border border-slate-200 dark:border-[#4d4635]";

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Scrollable content ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-900 dark:text-[#dce3f0] flex flex-wrap items-center gap-3">
                  Trading Console Terminal
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 uppercase font-black">
                    Admin Override Active
                  </span>
                </h2>
                <p className="text-[14px] text-slate-500 dark:text-[#d0c5af] mt-1 max-w-2xl">
                  Execute manual trade broadcasts across global investor nodes. Direct liquidity injection and platform ROI override controls.
                </p>
              </div>
              {/* Server time — bg-surface-container + border-outline-variant */}
              <div className="flex items-center gap-2 font-data-mono text-[12px] text-slate-500 dark:text-[#d0c5af] bg-slate-50 dark:bg-[#19202a] px-4 py-2 rounded-lg border border-slate-200 dark:border-[#4d4635] shrink-0">
                <span className="material-symbols-outlined text-[16px] text-[#4edea3]">schedule</span>
                Server Time: <ServerClock />
              </div>
            </div>
          </div>

          {/* 12-col grid */}
          <div className="grid grid-cols-12 gap-6 items-start">

            {/* ── LEFT ─────────────────────────────────────────────────────── */}
            <div className="col-span-12 lg:col-span-8 space-y-6">

              {/* Broadcast form — glass-panel + gold left border */}
              <div
                className="bg-white dark:bg-[rgba(25,32,42,0.4)] dark:backdrop-blur-md rounded-xl shadow-sm dark:shadow-none p-6"
                style={{ border: "1px solid #d4af37", borderLeftWidth: "4px" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">
                    Broadcast New Active Trade Position
                  </h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-[#99907c]">broadcast_on_personal</span>
                </div>

                <div className="space-y-6">
                  {/* Asset + Direction */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={label}>Asset Pair</label>
                      <select value={asset} onChange={(e) => handleAssetChange(e.target.value)} className={input}>
                        {Object.keys(ASSET_DATA).map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={label}>Order Direction</label>
                      {/* direction toggle — bg-surface-container-lowest in dark */}
                      <div className="flex h-[46px] p-1 bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg">
                        <button type="button" onClick={() => setDirection("LONG")}
                          className={`flex-1 flex items-center justify-center gap-2 rounded text-[12px] font-bold transition-all ${
                            direction === "LONG"
                              ? "bg-[#4edea3] text-[#003824] shadow-sm"
                              : "text-slate-400 dark:text-[#99907c] hover:text-slate-900 dark:hover:text-[#dce3f0]"
                          }`}>
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                          LONG
                        </button>
                        <button type="button" onClick={() => setDirection("SHORT")}
                          className={`flex-1 flex items-center justify-center gap-2 rounded text-[12px] font-bold transition-all ${
                            direction === "SHORT"
                              ? "bg-red-600 text-white shadow-sm"
                              : "text-slate-400 dark:text-[#99907c] hover:text-slate-900 dark:hover:text-[#dce3f0]"
                          }`}>
                          <span className="material-symbols-outlined text-[18px]">trending_down</span>
                          SHORT
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Leverage + Entry */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className={label}>Leverage</label>
                      <div className="relative">
                        <input className={input} type="text" value={leverage} onChange={(e) => setLeverage(e.target.value)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#99907c] text-[12px]">MAX</span>
                      </div>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className={label}>Entry Price</label>
                      <div className="relative">
                        <input className={input} type="text" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="0.00000" />
                        <button type="button" onClick={() => setEntry(ASSET_DATA[asset]?.entry ?? "")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4edea3] text-[12px] font-bold hover:opacity-75">
                          AUTO
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TP + SL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={label}>Take Profit (Target)</label>
                      <input className={input} type="text" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="0.00000" />
                    </div>
                    <div className="space-y-2">
                      <label className={label}>Stop Loss</label>
                      <input
                        className={`${input} border-red-300/50 dark:border-[#ffb4ab]/30 focus:ring-red-400/50`}
                        type="text" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="0.00000"
                      />
                    </div>
                  </div>

                  {/* Broadcast button */}
                  <div className="pt-2">
                    <button type="button" onClick={handleBroadcast} disabled={broadcasting}
                      className="group w-full bg-[#d4af37] hover:bg-[#c9a830] disabled:opacity-70 text-[#3c2f00] font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-[rgba(212,175,55,0.2)]">
                      <span className={`material-symbols-outlined ${broadcasting ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}>sync</span>
                      {broadcasting ? "BROADCASTING…" : "BROADCAST ACTIVE TRADE & SYNC LIVE"}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 dark:text-[#99907c] mt-3 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[12px]">security</span>
                      Action will be logged and synced with 12,842 nodes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active broadcasts table */}
              <div className={`${card} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.05)] bg-slate-50/80 dark:bg-[#080f18] flex justify-between items-center">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">
                    Current Active Broadcasts
                  </h3>
                  <span className="text-[10px] font-bold text-[#4edea3] bg-[#4edea3]/10 px-2 py-0.5 rounded">LIVE SYNCING</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50/80 dark:bg-[#080f18] text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        {["Asset Pair","Direction","Leverage","Entry / Current","P&L","Action"].map((h) => (
                          <th key={h} className="px-6 py-3 text-slate-500 dark:text-[#99907c]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {broadcasts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 dark:text-[#99907c] text-[13px]">
                            No active broadcasts. Use the form above to push a position.
                          </td>
                        </tr>
                      )}
                      {broadcasts.map((b) => (
                        <tr key={b.id} className="border-t border-slate-100 dark:border-[rgba(255,255,255,0.05)] hover:bg-slate-50/50 dark:hover:bg-[#242a34] transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-[#dce3f0]">{b.asset}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${b.direction === "LONG" ? "bg-[#4edea3] text-[#003824]" : "bg-red-700 text-white"}`}>
                              {b.direction}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-data-mono text-slate-600 dark:text-[#d0c5af]">{b.leverage}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#99907c]">E: {b.entry}</span>
                              <span className={`font-data-mono font-bold ${b.direction === "LONG" ? "text-[#4edea3]" : "text-red-400 dark:text-[#ffb4ab]"}`}>C: {b.current}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-data-mono font-bold text-[13px] ${b.pnl >= 0 ? "text-[#4edea3]" : "text-red-400 dark:text-[#ffb4ab]"}`}>
                              {b.pnl >= 0 ? "+" : ""}{b.pnl.toFixed(3)}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => handleTerminate(b.id, b.asset)}
                              className="px-3 py-1 rounded text-[10px] font-bold border border-red-300/50 dark:border-[#ffb4ab]/30 text-red-500 dark:text-[#ffb4ab] hover:bg-red-50 dark:hover:bg-[#ffb4ab]/10 transition-colors">
                              Terminate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── RIGHT ────────────────────────────────────────────────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-6">

              {/* Settled trades */}
              <div className={`${card} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.05)] bg-slate-50/80 dark:bg-[#080f18] flex justify-between items-center">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">Settled / Closed (24h)</h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-[#99907c] text-[18px]">history</span>
                </div>
                <div className="p-4 space-y-3">
                  {settled.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-50 dark:bg-[#080f18] rounded-lg border border-slate-100 dark:border-[#4d4635]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[11px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase">{s.asset}</p>
                          <p className={`text-[10px] font-bold ${s.direction === "LONG" ? "text-[#4edea3]" : "text-red-400 dark:text-[#ffb4ab]"}`}>
                            {s.direction} POSITION
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[11px] font-black ${s.pnl >= 0 ? "bg-[#4edea3]/10 text-[#4edea3]" : "bg-red-500/10 text-red-400 dark:text-[#ffb4ab]"}`}>
                          {s.pnl >= 0 ? "+" : ""}${Math.abs(s.pnl).toFixed(2)} {s.pnl >= 0 ? "PROFIT" : "LOSS"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-data-mono mb-3">
                        <div className="flex justify-between border-r border-slate-200 dark:border-[#4d4635] pr-2">
                          <span className="text-slate-500 dark:text-[#99907c]">ENTRY</span>
                          <span className="text-slate-700 dark:text-[#dce3f0]">{s.entry}</span>
                        </div>
                        <div className="flex justify-between pl-1">
                          <span className="text-slate-500 dark:text-[#99907c]">EXIT</span>
                          <span className="text-slate-700 dark:text-[#dce3f0] font-bold">{s.exit}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => !s.archived && handleArchive(s.id)} disabled={s.archived}
                        className={`w-full py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                          s.archived
                            ? "bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 cursor-default"
                            : "bg-white dark:bg-[#19202a] border border-slate-200 dark:border-[#4d4635] text-slate-500 dark:text-[#d0c5af] hover:text-[#d4af37] hover:border-[#d4af37]"
                        }`}>
                        <span className="material-symbols-outlined text-[14px]">{s.archived ? "check_circle" : "archive"}</span>
                        {s.archived ? "Archived" : "Archive to User History"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Metrics Override */}
              <div className={`${card} p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">Global Metrics Override</h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-[#99907c]">tune</span>
                </div>
                <div className="space-y-4">
                  <div className={metricRow}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#4edea3]/10 rounded">
                        <span className="material-symbols-outlined text-[#4edea3] text-[20px]">percent</span>
                      </div>
                      <span className="text-[14px] font-bold text-slate-700 dark:text-[#dce3f0]">Platform ROI %</span>
                    </div>
                    <input className="w-20 bg-transparent text-right font-data-mono text-[#d4af37] font-bold outline-none focus:underline"
                      type="text" value={roi} onChange={(e) => setRoi(e.target.value)} />
                  </div>
                  <div className={metricRow}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#d4af37]/10 rounded">
                        <span className="material-symbols-outlined text-[#d4af37] text-[20px]">speed</span>
                      </div>
                      <span className="text-[14px] font-bold text-slate-700 dark:text-[#dce3f0]">Execution Latency</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input className="w-16 bg-transparent text-right font-data-mono text-[#d4af37] font-bold outline-none focus:underline"
                        type="text" value={latency} onChange={(e) => setLatency(e.target.value)} />
                      <span className="text-[10px] text-slate-400 dark:text-[#99907c] font-bold">MS</span>
                    </div>
                  </div>
                  <div className={metricRow}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#ffb4ab]/10 rounded">
                        <span className="material-symbols-outlined text-[#ffb4ab] text-[20px]">warning</span>
                      </div>
                      <span className="text-[14px] font-bold text-slate-700 dark:text-[#dce3f0]">Max Drawdown %</span>
                    </div>
                    <input className="w-20 bg-transparent text-right font-data-mono text-[#ffb4ab] font-bold outline-none focus:underline"
                      type="text" value={drawdown} onChange={(e) => setDrawdown(e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={handleMetricsApply}
                  className="w-full mt-5 py-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-[11px] font-bold tracking-widest hover:bg-[#d4af37]/20 transition-colors uppercase">
                  Apply & Broadcast Metrics
                </button>
              </div>

              {/* Pool Allocations */}
              <div className={`${card} p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">Pool Allocations</h3>
                  <span className="text-[11px] font-data-mono text-slate-400 dark:text-[#99907c]">
                    Total: {pools.reduce((s, p) => s + p.pct, 0)}%
                  </span>
                </div>
                <div className="space-y-4">
                  {pools.map((pool, idx) => (
                    <div key={pool.name} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                          <span className="text-slate-500 dark:text-[#d0c5af]">{pool.name}</span>
                          <span className="text-slate-900 dark:text-[#dce3f0]">{pool.pct}%</span>
                        </div>
                        {/* track: surface-container-highest = #2e353f */}
                        <div className="h-1.5 bg-slate-100 dark:bg-[#2e353f] rounded-full overflow-hidden">
                          <div className={`h-full ${pool.color} transition-all duration-300`} style={{ width: `${pool.pct}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustPool(idx, -5)}
                          className="size-6 rounded flex items-center justify-center bg-slate-100 dark:bg-[#19202a] text-slate-500 dark:text-[#d0c5af] hover:text-[#d4af37] hover:bg-[#242a34] transition-colors text-[14px] font-bold">
                          −
                        </button>
                        <span className="w-10 text-center font-data-mono text-[12px] text-slate-900 dark:text-[#dce3f0]">{pool.pct}</span>
                        <button onClick={() => adjustPool(idx, +5)}
                          className="size-6 rounded flex items-center justify-center bg-slate-100 dark:bg-[#19202a] text-slate-500 dark:text-[#d0c5af] hover:text-[#d4af37] hover:bg-[#242a34] transition-colors text-[14px] font-bold">
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Update button: border-outline-variant, hover bg-surface-container-high */}
                <button type="button" onClick={handlePoolUpdate}
                  className="w-full mt-6 py-2 border border-slate-200 dark:border-[#4d4635] text-[11px] font-bold tracking-widest text-slate-600 dark:text-[#d0c5af] hover:bg-slate-50 dark:hover:bg-[#242a34] transition-colors rounded uppercase">
                  Update Allocation Weights
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Terminal log footer — glass-panel ────────────────────────────── */}
        <div
          className="shrink-0 bg-white dark:bg-[rgba(13,20,29,0.85)] dark:[backdrop-filter:blur(12px)] border-t border-slate-200 dark:border-[rgba(255,255,255,0.1)] px-4 sm:px-8 py-3 transition-all duration-300 overflow-hidden"
          style={{ height: logOpen ? "7.5rem" : "2.75rem" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#4edea3] rounded-full animate-pulse" />
              Recent Broadcast Terminal Logs
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-data-mono text-slate-400 dark:text-[#99907c]">
                Terminal Session ID: TRX-992-KLA
              </span>
              <button onClick={() => setLogOpen((o) => !o)}
                className="flex items-center justify-center size-6 rounded-full bg-slate-100 dark:bg-[#19202a] text-slate-400 dark:text-[#99907c] hover:bg-slate-200 dark:hover:bg-[#242a34] transition-colors">
                <ChevronDown className="size-3.5 transition-transform duration-300" style={{ transform: logOpen ? "rotate(0deg)" : "rotate(180deg)" }} />
              </button>
            </div>
          </div>
          {/* log bg: surface-container-lowest/50 */}
          <div className="bg-slate-50 dark:bg-[rgba(8,15,24,0.5)] rounded p-2 h-16 overflow-y-auto border border-slate-100 dark:border-[rgba(255,255,255,0.05)]">
            <div className="space-y-1 font-data-mono text-[11px]">
              {logs.map((log, i) => (
                <p key={i} className="text-slate-700 dark:text-[#d0c5af]">
                  <span className={`${log.color} font-bold opacity-80`}>[{log.time} GMT]</span>{" "}
                  {log.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
