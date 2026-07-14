"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Search, X } from "lucide-react";

import { useSessionHydration } from "@/src/hooks/useSessionHydration";
import { useAdminUserSearch } from "@/src/features/notifications/hooks/useNotifications";
import {
  fetchMarketPrice,
  useClosePosition,
  useConsoleExecutions,
  useMyAssignedInvestors,
  useOpenPosition,
  useUpdatePrice,
  type ConsoleExecution,
} from "@/src/features/admin/hooks/useTradingConsole";
import { computeRiskReward, formatRiskReward } from "@/src/lib/trading/risk-reward";
import { classifyAssetPair, computeNotionalUsd, computePositionPl, nominalLeverageLabel } from "@/src/lib/trading/lot-size";

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
// outline-variant:         #4d4635  ← input borders
// on-surface:              #dce3f0  ← main text
// primary-container:       #d4af37   secondary: #4edea3   error: #ffb4ab

// All tradeable pairs — grouped by asset class. The console auto-fetches
// the live price for every pair that has a feed; this list is just the
// selection menu.
const ASSET_PAIRS: { group: string; pairs: string[] }[] = [
  {
    group: "Forex Majors",
    pairs: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD"],
  },
  {
    group: "Forex Crosses",
    pairs: ["EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/AUD", "GBP/JPY", "GBP/AUD", "AUD/JPY", "USD/MXN", "USD/TRY"],
  },
  {
    group: "Metals",
    pairs: ["XAU/USD", "XAG/USD"],
  },
  {
    group: "Crypto",
    pairs: ["BTC/USD", "ETH/USD", "BNB/USD", "XRP/USD", "SOL/USD", "ADA/USD", "DOGE/USD", "LTC/USD"],
  },
];


type LogEntry = { time: string; color: string; text: string };

function makeLog(text: string, color = "text-[#4edea3]"): LogEntry {
  return {
    time: new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "GMT",
    }),
    color,
    text,
  };
}

// Percentage move sign-adjusted for side (used for the compact % shown in
// the row before a live refresh has run).
function unrealizedPct(e: ConsoleExecution): number | null {
  if (e.current_price == null || Number(e.entry_price) === 0) return null;
  const raw = ((Number(e.current_price) - Number(e.entry_price)) / Number(e.entry_price)) * 100;
  return e.side === "SHORT" ? -raw : raw;
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

// ── Inline editable current-price cell ────────────────────────────────────────
function PriceCell({
  execution,
  canEdit,
  onApply,
}: {
  execution: ConsoleExecution;
  canEdit: boolean;
  onApply: (price: number) => void;
}) {
  const [value, setValue] = useState(String(execution.current_price ?? ""));
  const [syncedPrice, setSyncedPrice] = useState(execution.current_price);
  if (syncedPrice !== execution.current_price) {
    setSyncedPrice(execution.current_price);
    setValue(String(execution.current_price ?? ""));
  }

  const apply = () => {
    const price = Number(value);
    if (price > 0 && price !== Number(execution.current_price)) onApply(price);
  };

  if (!canEdit) {
    return <span className="font-data-mono font-bold">{execution.current_price ?? "—"}</span>;
  }
  return (
    <input
      className="w-24 bg-transparent font-data-mono font-bold outline-none border-b border-dashed border-slate-300 dark:border-[#4d4635] focus:border-[#d4af37] text-inherit"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      aria-label={`Current price for ${execution.asset_pair}`}
    />
  );
}

// ── Investor targeting picker ─────────────────────────────────────────────────
// admin: dropdown limited to their own assigned roster (can't broadcast).
// super_admin: choice between "Broadcast to pool" and searching any investor.
function TargetingPicker({
  isSuperAdmin,
  targetInvestorId,
  onChange,
}: {
  isSuperAdmin: boolean;
  targetInvestorId: string | null;
  onChange: (id: string | null, label: string) => void;
}) {
  const { data: mine } = useMyAssignedInvestors(!isSuperAdmin);
  const [mode, setMode] = useState<"broadcast" | "targeted">(isSuperAdmin ? "broadcast" : "targeted");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  const { data: searchData } = useAdminUserSearch(isSuperAdmin && mode === "targeted" ? debounced : "");

  if (!isSuperAdmin) {
    const roster = mine?.assignments ?? [];
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-wider">
          Assigned Investor (required)
        </label>
        <select
          value={targetInvestorId ?? ""}
          onChange={(e) => {
            const inv = roster.find((r) => r.investorId === e.target.value);
            onChange(e.target.value || null, inv?.investorName ?? "");
          }}
          className="w-full bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg p-3 text-slate-900 dark:text-[#dce3f0] font-data-mono focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-colors"
        >
          <option value="">Select an investor…</option>
          {roster.map((r) => (
            <option key={r.investorId} value={r.investorId}>{r.investorName} ({r.investorEmail})</option>
          ))}
        </select>
        {roster.length === 0 && (
          <p className="text-[11px] text-amber-600 dark:text-[#e9c349]">
            No investors are assigned to you yet — ask the Platform Controller.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex h-9 p-1 bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg text-[11px] font-bold">
        <button type="button" onClick={() => { setMode("broadcast"); onChange(null, ""); }}
          className={`flex-1 rounded transition-all ${mode === "broadcast" ? "bg-[#d4af37] text-[#3c2f00]" : "text-slate-400 dark:text-[#99907c]"}`}>
          Broadcast to All Investors
        </button>
        <button type="button" onClick={() => setMode("targeted")}
          className={`flex-1 rounded transition-all ${mode === "targeted" ? "bg-[#d4af37] text-[#3c2f00]" : "text-slate-400 dark:text-[#99907c]"}`}>
          Target One Investor
        </button>
      </div>
      {mode === "targeted" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={targetInvestorId ? query : query}
            onChange={(e) => { setQuery(e.target.value); onChange(null, ""); }}
            placeholder="Search investor by name or email…"
            className="w-full bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg p-2.5 pl-9 text-[12px] text-slate-900 dark:text-[#dce3f0] outline-none focus:border-[#d4af37]"
          />
          {debounced.length >= 2 && !targetInvestorId && (
            <ul className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#4d4635] bg-white dark:bg-[#0d141d] shadow-lg divide-y divide-slate-50 dark:divide-white/5">
              {(searchData?.results ?? []).map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => { onChange(r.id, r.name); setQuery(r.name); }}
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-slate-50 dark:hover:bg-white/5">
                    <span className="font-semibold text-slate-800 dark:text-[#dce3f0]">{r.name}</span>{" "}
                    <span className="text-slate-400 dark:text-[#99907c]">{r.email}</span>
                  </button>
                </li>
              ))}
              {(searchData?.results ?? []).length === 0 && (
                <li className="px-3 py-2 text-[11px] text-slate-400 dark:text-[#99907c]">No matches.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TradingConsolePage() {
  const session = useSessionHydration();
  const isSuperAdmin = session?.user.role === "super_admin";
  const canOpen = session?.user.role === "super_admin" || session?.user.role === "admin";

  const { data, isLoading } = useConsoleExecutions("open");
  const { data: closedData } = useConsoleExecutions("closed");
  const openMutation = useOpenPosition();
  const closeMutation = useClosePosition();
  const priceMutation = useUpdatePrice();

  const pools = data?.pools ?? [];
  const openExecutions = data?.executions ?? [];
  const closedExecutions = (closedData?.executions ?? []).slice(0, 6);

  // Form state
  const [asset, setAsset] = useState("EUR/USD");
  const [poolId, setPoolId] = useState("");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [lotSize, setLotSize] = useState("0.5");
  const [entry, setEntry] = useState("");
  const [fetchingEntry, setFetchingEntry] = useState(false);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [targetInvestorId, setTargetInvestorId] = useState<string | null>(null);
  const [targetLabel, setTargetLabel] = useState("");

  // Close-position dialog
  const [closing, setClosing] = useState<ConsoleExecution | null>(null);
  const [closePrice, setClosePrice] = useState("");
  const [closePl, setClosePl] = useState("");
  const [fetchingClosePrice, setFetchingClosePrice] = useState(false);

  // Per-row live-price refresh state
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Live prices for open positions (auto-polled every 5s, no DB write for display).
  // When the admin explicitly refreshes, it also writes to DB so investors see it.
  const [livePrices, setLivePrices] = useState<Map<string, number>>(new Map());
  const autoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([
    makeLog("Trading console connected — live position data active.", "text-[#4edea3]"),
  ]);
  const [logOpen, setLogOpen] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  // Default the pool selector to the first pool once pools arrive
  // (adjust-during-render, no effect needed).
  if (pools.length > 0 && !poolId) setPoolId(pools[0].id);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") =>
    setToast({ msg, type });
  const addLog = (text: string, color?: string) =>
    setLogs((prev) => [makeLog(text, color), ...prev.slice(0, 7)]);

  // Auto-fetch live price whenever the selected pair changes.
  async function handleAssetChange(val: string) {
    setAsset(val);
    setEntry("");
    setFetchingEntry(true);
    try {
      const result = await fetchMarketPrice(val);
      if (result.available && result.price) {
        setEntry(String(result.price));
      }
    } finally {
      setFetchingEntry(false);
    }
  }

  // Fetch live entry price on first mount for the default pair.
  useEffect(() => {
    fetchMarketPrice("EUR/USD").then((r) => {
      if (r.available && r.price) setEntry(String(r.price));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-poll live prices for open positions every 5s.
  // Writes to DB so investors also see the updated current_price.
  useEffect(() => {
    if (!canOpen || openExecutions.length === 0) return;
    let cancelled = false;

    const poll = async () => {
      const uniquePairs = [...new Set(
        openExecutions
          .filter((e) => classifyAssetPair(e.asset_pair) !== "other")
          .map((e) => e.asset_pair)
      )];
      const updates = new Map<string, number>();
      await Promise.all(
        uniquePairs.map(async (pair) => {
          const r = await fetchMarketPrice(pair);
          if (r.available && r.price && !cancelled) updates.set(pair, r.price);
        })
      );
      if (cancelled || updates.size === 0) return;

      // Update local live-price display
      setLivePrices((prev) => new Map([...prev, ...updates]));

      // Push to DB for each open position (so investors see the price too)
      for (const e of openExecutions) {
        const newPrice = updates.get(e.asset_pair);
        if (!newPrice || cancelled) continue;
        const current = Number(e.current_price ?? 0);
        // Only write if price moved more than 0.001% (avoid noisy identical writes)
        if (current > 0 && Math.abs((newPrice - current) / current) < 0.00001) continue;
        priceMutation.mutate({ id: e.id, currentPrice: newPrice });
      }
    };

    void poll();
    autoPollRef.current = setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      if (autoPollRef.current) clearInterval(autoPollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOpen, openExecutions.length]);

  const derivedLeverage = nominalLeverageLabel(asset);
  const parsedLotSize = Number(lotSize);
  const notionalPreview =
    parsedLotSize > 0 && Number(entry) > 0 ? computeNotionalUsd(asset, parsedLotSize, Number(entry)) : null;

  async function handleOpen() {
    if (!canOpen) return;
    const entryPrice = Number(entry);
    if (!poolId || !(entryPrice > 0) || !(parsedLotSize > 0)) {
      showToast("Select a category, and enter a valid entry price and lot size.", "error");
      return;
    }
    if (!isSuperAdmin && !targetInvestorId) {
      showToast("Select which of your assigned investors this trade is for.", "error");
      return;
    }
    try {
      await openMutation.mutateAsync({
        strategyPoolId: poolId,
        assetPair: asset,
        side: direction,
        lotSize: parsedLotSize,
        entryPrice,
        takeProfitPrice: tp ? Number(tp) : undefined,
        stopLossPrice: sl ? Number(sl) : undefined,
        targetInvestorId: targetInvestorId ?? undefined,
      });
      const rr = tp && sl ? formatRiskReward(computeRiskReward(entryPrice, Number(tp), Number(sl))) : null;
      const who = targetInvestorId ? `targeted at ${targetLabel}` : "broadcast to all investors";
      addLog(`Opened ${direction} ${asset} @ ${entry}, lot ${parsedLotSize} (${who})${rr ? `, R:R ${rr}` : ""}.`, "text-[#4edea3]");
      showToast(`${asset} ${direction} position is live.`, "success");
      setTp(""); setSl(""); setTargetInvestorId(null); setTargetLabel("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to open position.", "error");
    }
  }

  async function handlePriceApply(execution: ConsoleExecution, price: number) {
    try {
      await priceMutation.mutateAsync({ id: execution.id, currentPrice: price });
      addLog(`${execution.asset_pair} marked to ${price}.`, "text-[#d4af37]");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Price update failed.", "error");
    }
  }

  async function handleRefreshLivePrice(execution: ConsoleExecution) {
    setRefreshingId(execution.id);
    try {
      const result = await fetchMarketPrice(execution.asset_pair);
      if (!result.available || !result.price) {
        showToast(result.reason ?? "No live price available for this pair.", "info");
        return;
      }
      await handlePriceApply(execution, result.price);
      showToast(`${execution.asset_pair} refreshed to live price (${result.source}).`, "success");
    } finally {
      setRefreshingId(null);
    }
  }

  async function openCloseDialog(execution: ConsoleExecution) {
    setClosing(execution);
    setClosePrice(String(execution.current_price ?? execution.entry_price ?? ""));
    setClosePl("");

    // Best-effort live refresh so the close dialog opens with a real quote
    // and a computed P/L preview when a feed exists for this pair — never
    // blocks the admin from typing their own numbers instead.
    if (execution.lot_size != null && classifyAssetPair(execution.asset_pair) !== "other") {
      setFetchingClosePrice(true);
      try {
        const result = await fetchMarketPrice(execution.asset_pair);
        if (result.available && result.price) {
          setClosePrice(String(result.price));
          const pl = computePositionPl(
            execution.asset_pair,
            execution.side,
            Number(execution.lot_size),
            Number(execution.entry_price),
            result.price
          );
          setClosePl(String(pl));
        }
      } finally {
        setFetchingClosePrice(false);
      }
    }
  }

  async function handleCloseConfirm() {
    if (!closing) return;
    const price = closePrice ? Number(closePrice) : undefined;
    const pl = closePl ? Number(closePl) : NaN;

    // If the admin left P/L blank but we have lot_size + a close price, compute
    // it now rather than forcing a guess.
    let finalPl = pl;
    if (!Number.isFinite(finalPl) && closing.lot_size != null && price) {
      finalPl = computePositionPl(closing.asset_pair, closing.side, Number(closing.lot_size), Number(closing.entry_price), price);
    }
    if (!Number.isFinite(finalPl)) {
      showToast("Enter the realized P/L in USD (or a close price, for lot-sized trades).", "error");
      return;
    }
    try {
      const { result } = await closeMutation.mutateAsync({ id: closing.id, closePrice: price, realizedPlUsd: finalPl });
      addLog(
        `Closed ${closing.asset_pair} @ ${price ?? "last mark"} — ${finalPl >= 0 ? "+" : ""}$${finalPl} distributed to ${result?.investors_credited ?? 0} investor(s).`,
        finalPl >= 0 ? "text-[#4edea3]" : "text-[#ffb4ab]"
      );
      showToast(`${closing.asset_pair} closed. ${result?.investors_credited ?? 0} investor(s) credited.`, "success");
      setClosing(null); setClosePrice(""); setClosePl("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to close position.", "error");
    }
  }

  // ── Shared dark-mode class strings (exact stitch tokens) ──────────────────
  const card  = "bg-white dark:bg-[rgba(25,32,42,0.4)] dark:backdrop-blur-md rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.08)] shadow-sm dark:shadow-none";
  const input = "w-full bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg p-3 text-slate-900 dark:text-[#dce3f0] font-data-mono focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-colors";
  const label = "text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-wider";

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Close-position dialog */}
      {closing && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setClosing(null)}>
          <div className={`${card} w-full max-w-sm p-6 dark:!bg-[#0d141d]`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[13px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider mb-1">
              Close {closing.asset_pair} ({closing.side})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#99907c] mb-5">
              {closing.target_investor_id
                ? "The stated P/L is credited entirely to the targeted investor."
                : "The stated P/L is credited in full to every approved investor — the same dollar amount each."}
              {" "}Atomic, via the ledger.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={label}>
                  Close Price {fetchingClosePrice && <Loader2 className="inline size-3 animate-spin ml-1" />}
                </label>
                <input className={input} value={closePrice} onChange={(e) => setClosePrice(e.target.value)} placeholder={String(closing.current_price ?? closing.entry_price)} />
              </div>
              <div className="space-y-2">
                <label className={label}>
                  Realized P/L (USD{closing.target_investor_id ? "" : ", applies to every investor"} — negative for a loss)
                </label>
                <input className={input} value={closePl} onChange={(e) => setClosePl(e.target.value)} placeholder="e.g. 1250 or -400" />
                {closing.lot_size != null && (
                  <p className="text-[10px] text-slate-400 dark:text-[#99907c]">
                    Auto-computed from lot size {closing.lot_size} when a live price is available — still editable.
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setClosing(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-[#4d4635] text-[12px] font-bold text-slate-600 dark:text-[#d0c5af] hover:bg-slate-50 dark:hover:bg-[#242a34] transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleCloseConfirm} disabled={closeMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#ffb4ab] text-[#690005] text-[12px] font-bold hover:opacity-90 disabled:opacity-60 transition-all">
                  {closeMutation.isPending ? "Closing..." : "Close & Distribute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-900 dark:text-[#dce3f0] flex flex-wrap items-center gap-3">
                  Trading Console Terminal
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 uppercase font-black">
                    {isSuperAdmin ? "Platform Controller" : canOpen ? "Account Manager" : "Read Only"}
                  </span>
                </h2>
                <p className="text-[14px] text-slate-500 dark:text-[#d0c5af] mt-1 max-w-2xl">
                  {isSuperAdmin
                    ? "Broadcast a trade to every investor, or target one specific investor. Positions appear live on investor terminals; closing credits P/L through the ledger."
                    : "Open trades for your assigned investors. Closing a position credits that investor directly through the ledger."}
                </p>
              </div>
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

              {/* Open-position form */}
              <div
                className="bg-white dark:bg-[rgba(25,32,42,0.4)] dark:backdrop-blur-md rounded-xl shadow-sm dark:shadow-none p-6"
                style={{ border: "1px solid #d4af37", borderLeftWidth: "4px" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">
                    Open New Trade Position
                  </h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-[#99907c]">broadcast_on_personal</span>
                </div>

                <div className="space-y-6">
                  {canOpen && (
                    <TargetingPicker
                      isSuperAdmin={isSuperAdmin}
                      targetInvestorId={targetInvestorId}
                      onChange={(id, lbl) => { setTargetInvestorId(id); setTargetLabel(lbl); }}
                    />
                  )}

                  {/* Asset + Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={label}>Asset Pair</label>
                      <select value={asset} onChange={(e) => void handleAssetChange(e.target.value)} className={input}>
                        {ASSET_PAIRS.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.pairs.map((p) => <option key={p} value={p}>{p}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={label}>Trade Category</label>
                      <select value={poolId} onChange={(e) => setPoolId(e.target.value)} className={input}>
                        {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Direction */}
                  <div className="space-y-2">
                    <label className={label}>Order Direction</label>
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

                  {/* Lot size + Entry — leverage is derived, not typed */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className={label}>Lot Size</label>
                      <input className={input} type="text" value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="0.5" />
                      <p className="text-[10px] text-slate-400 dark:text-[#99907c]">Leverage: <span className="font-bold text-slate-600 dark:text-[#d0c5af]">{derivedLeverage}</span></p>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className={label}>
                        Entry Price
                        {fetchingEntry && <Loader2 className="inline size-3 animate-spin ml-1.5 text-[#d4af37]" />}
                      </label>
                      <div className="relative">
                        <input
                          className={input}
                          type="text"
                          value={entry}
                          onChange={(e) => setEntry(e.target.value)}
                          placeholder={fetchingEntry ? "Fetching live price…" : "0.00000"}
                          disabled={fetchingEntry}
                        />
                        <button
                          type="button"
                          disabled={fetchingEntry}
                          onClick={() => void handleAssetChange(asset)}
                          title="Refresh live price"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4edea3] hover:opacity-75 disabled:opacity-40"
                        >
                          <RefreshCw className={`size-3.5 ${fetchingEntry ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                      {notionalPreview != null && (
                        <p className="text-[10px] text-slate-400 dark:text-[#99907c]">
                          Notional exposure: <span className="font-bold text-slate-600 dark:text-[#d0c5af]">{notionalPreview.toLocaleString("en-US", { style: "currency", currency: "USD" })}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* TP + SL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={label}>Take Profit (optional)</label>
                      <input className={input} type="text" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="0.00000" />
                    </div>
                    <div className="space-y-2">
                      <label className={label}>Stop Loss (optional)</label>
                      <input
                        className={`${input} border-red-300/50 dark:border-[#ffb4ab]/30 focus:ring-red-400/50`}
                        type="text" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="0.00000"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <button type="button" onClick={handleOpen} disabled={openMutation.isPending || !canOpen}
                      title={canOpen ? undefined : "Only staff can open positions"}
                      className="group w-full bg-[#d4af37] hover:bg-[#c9a830] disabled:opacity-50 disabled:cursor-not-allowed text-[#3c2f00] font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-[rgba(212,175,55,0.2)]">
                      <span className={`material-symbols-outlined ${openMutation.isPending ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}>sync</span>
                      {openMutation.isPending ? "OPENING…" : "OPEN POSITION & SYNC LIVE"}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 dark:text-[#99907c] mt-3 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[12px]">security</span>
                      Every action is written to the manual-adjustments audit trail.
                    </p>
                  </div>
                </div>
              </div>

              {/* Open positions table */}
              <div className={`${card} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.05)] bg-slate-50/80 dark:bg-[#080f18] flex justify-between items-center">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">
                    Open Positions
                  </h3>
                  <span className="text-[10px] font-bold text-[#4edea3] bg-[#4edea3]/10 px-2 py-0.5 rounded">LIVE SYNCING</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[720px]">
                    <thead className="bg-slate-50/80 dark:bg-[#080f18] text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        {["Asset Pair","Target","Direction","Lot / Lev","Entry / Current","Unrealized","Action"].map((h) => (
                          <th key={h} className="px-6 py-3 text-slate-500 dark:text-[#99907c]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading && (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 dark:text-[#99907c] text-[13px]">Loading positions...</td></tr>
                      )}
                      {!isLoading && openExecutions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-400 dark:text-[#99907c] text-[13px]">
                            No open positions. Use the form above to open one.
                          </td>
                        </tr>
                      )}
                      {openExecutions.map((e) => {
                        // Prefer the auto-polled live price over the DB snapshot for display
                        const livePrice = livePrices.get(e.asset_pair);
                        const displayExecution = livePrice
                          ? { ...e, current_price: livePrice }
                          : e;
                        const pct = unrealizedPct(displayExecution);
                        const canManage = isSuperAdmin || e.target_investor_id != null;
                        const hasLiveFeed = classifyAssetPair(e.asset_pair) !== "other";
                        return (
                          <tr key={e.id} className="border-t border-slate-100 dark:border-[rgba(255,255,255,0.05)] hover:bg-slate-50/50 dark:hover:bg-[#242a34] transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-[#dce3f0]">{e.asset_pair}</td>
                            <td className="px-6 py-4 text-[12px] text-slate-500 dark:text-[#d0c5af]">
                              {e.target_investor_id ? (
                                <span className="px-1.5 py-0.5 rounded bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-bold">
                                  {e.deposit_users?.full_name ?? "Investor"}
                                </span>
                              ) : (
                                e.strategy_pools?.name ?? "—"
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${e.side === "LONG" ? "bg-[#4edea3] text-[#003824]" : "bg-red-700 text-white"}`}>
                                {e.side}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-data-mono text-slate-600 dark:text-[#d0c5af] text-[11px]">
                              {e.lot_size != null ? `${e.lot_size} lot` : "—"}<br />
                              <span className="text-slate-400 dark:text-[#99907c]">{e.leverage ?? "—"}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#99907c]">E: {e.entry_price}</span>
                                <span className={`flex items-center gap-1 ${e.side === "LONG" ? "text-[#4edea3]" : "text-red-400 dark:text-[#ffb4ab]"}`}>
                                  C: <PriceCell execution={displayExecution} canEdit={canManage} onApply={(price) => handlePriceApply(e, price)} />
                                  {canManage && hasLiveFeed && (
                                    <button
                                      onClick={() => handleRefreshLivePrice(e)}
                                      disabled={refreshingId === e.id}
                                      title="Refresh from live market price"
                                      className="text-slate-400 hover:text-[#d4af37] disabled:opacity-50"
                                    >
                                      <RefreshCw className={`size-3 ${refreshingId === e.id ? "animate-spin" : ""}`} />
                                    </button>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`font-data-mono font-bold text-[13px] ${(pct ?? 0) >= 0 ? "text-[#4edea3]" : "text-red-400 dark:text-[#ffb4ab]"}`}>
                                {pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(3)}%`}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => openCloseDialog(e)}
                                disabled={!canManage}
                                title={canManage ? undefined : "Only the assigned manager or Platform Controller can close this"}
                                className="px-3 py-1 rounded text-[10px] font-bold border border-red-300/50 dark:border-[#ffb4ab]/30 text-red-500 dark:text-[#ffb4ab] hover:bg-red-50 dark:hover:bg-[#ffb4ab]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Close
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── RIGHT ────────────────────────────────────────────────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-6">

              {/* Closed trades */}
              <div className={`${card} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.05)] bg-slate-50/80 dark:bg-[#080f18] flex justify-between items-center">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">Settled / Closed</h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-[#99907c] text-[18px]">history</span>
                </div>
                <div className="p-4 space-y-3">
                  {closedExecutions.length === 0 && (
                    <p className="py-6 text-center text-[12px] text-slate-400 dark:text-[#99907c]">
                      Closed positions appear here with their distributed P/L.
                    </p>
                  )}
                  {closedExecutions.map((e) => {
                    const pl = Number(e.realized_pl_usd ?? 0);
                    const rr = formatRiskReward(
                      computeRiskReward(
                        Number(e.entry_price),
                        e.take_profit_price != null ? Number(e.take_profit_price) : null,
                        e.stop_loss_price != null ? Number(e.stop_loss_price) : null
                      )
                    );
                    return (
                      <div key={e.id} className="p-3 bg-slate-50 dark:bg-[#080f18] rounded-lg border border-slate-100 dark:border-[#4d4635]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[11px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase">{e.asset_pair}</p>
                            <p className={`text-[10px] font-bold ${e.side === "LONG" ? "text-[#4edea3]" : "text-red-400 dark:text-[#ffb4ab]"}`}>
                              {e.side} POSITION{e.target_investor_id ? ` · ${e.deposit_users?.full_name ?? "targeted"}` : ""}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-[11px] font-black ${pl >= 0 ? "bg-[#4edea3]/10 text-[#4edea3]" : "bg-red-500/10 text-red-400 dark:text-[#ffb4ab]"}`}>
                            {pl >= 0 ? "+" : "-"}${Math.abs(pl).toFixed(2)} {pl >= 0 ? "PROFIT" : "LOSS"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-data-mono">
                          <div className="flex justify-between border-r border-slate-200 dark:border-[#4d4635] pr-2">
                            <span className="text-slate-500 dark:text-[#99907c]">ENTRY</span>
                            <span className="text-slate-700 dark:text-[#dce3f0]">{e.entry_price}</span>
                          </div>
                          <div className="flex justify-between pl-1">
                            <span className="text-slate-500 dark:text-[#99907c]">EXIT</span>
                            <span className="text-slate-700 dark:text-[#dce3f0] font-bold">{e.current_price ?? "—"}</span>
                          </div>
                        </div>
                        {rr !== "—" && (
                          <div className="mt-2 text-[10px] font-data-mono text-slate-500 dark:text-[#99907c]">
                            Risk:Reward <span className="text-slate-700 dark:text-[#dce3f0] font-bold">{rr}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Still pending their own phases */}
              <div className={`${card} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">Platform Controls</h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-[#99907c]">tune</span>
                </div>
                <div className="space-y-3 text-[12px] text-slate-500 dark:text-[#d0c5af]">
                  <p className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37] mt-0.5">pie_chart</span>
                    <span><span className="font-bold text-slate-700 dark:text-[#dce3f0]">Trade category breakdown</span> lives in Trade Categories.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37] mt-0.5">settings</span>
                    <span><span className="font-bold text-slate-700 dark:text-[#dce3f0]">Global metrics</span> (platform ROI, drawdown limits) become tunable in System Settings.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Terminal log footer ───────────────────────────────────────────── */}
        <div
          className="shrink-0 bg-white dark:bg-[rgba(13,20,29,0.85)] dark:[backdrop-filter:blur(12px)] border-t border-slate-200 dark:border-[rgba(255,255,255,0.1)] px-4 sm:px-8 py-3 transition-all duration-300 overflow-hidden"
          style={{ height: logOpen ? "7.5rem" : "2.75rem" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#4edea3] rounded-full animate-pulse" />
              Console Action Log
            </h4>
            <button onClick={() => setLogOpen((o) => !o)}
              className="flex items-center justify-center size-6 rounded-full bg-slate-100 dark:bg-[#19202a] text-slate-400 dark:text-[#99907c] hover:bg-slate-200 dark:hover:bg-[#242a34] transition-colors">
              <ChevronDown className="size-3.5 transition-transform duration-300" style={{ transform: logOpen ? "rotate(0deg)" : "rotate(180deg)" }} />
            </button>
          </div>
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
