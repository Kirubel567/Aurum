"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Wallet,
  Shield,
  Zap,
  Smartphone,
  FileText,
  CalendarCheck,
  Headphones,
  CircleHelp,
  ChevronRight,
  X,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";

import { ROUTES } from "@/src/lib/constants/routes";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type WalletSummary = {
  balance: number;
  lockedPrincipal: number;
  availableBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  walletId: string;
  activatedOn: string | null;
  currency: string;
  accountType: string;
  kycLevel: string;
  dailyLimit: number;
  monthlyLimit: number;
  withdrawalMethod: string;
  status: string;
  latestDeposit: {
    settledAmountUsd: number;
    amountSubmitted: number;
    currencySubmitted: string;
    method: string;
    txReference: string;
    date: string | null;
  } | null;
};

type LedgerEntry = {
  id: string;
  createdAt: string;
  entryType: string;
  amount: number;
  note: string | null;
  referenceId: string | null;
};

type WithdrawalRow = {
  id: string;
  createdAt: string;
  amountUsd: number;
  feeUsd: number;
  netUsd: number;
  method: string;
  status: string;
  reference: string;
  reviewedAt: string | null;
  txHash: string | null;
  rejectionReason: string | null;
};

type WalletDetails = {
  walletId: string;
  status: string;
  activatedOn: string | null;
  currency: string;
  accountType: string;
  withdrawalMethod: string;
  kycLevel: string;
  dailyLimit: number;
  monthlyLimit: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " • " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

function nextWithdrawalWindows() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const windows: { cycle: string; cutoff: Date; processing: Date }[] = [];

  // Build 3 upcoming windows from the 1st/15th cycle
  let baseMonth = m;
  let baseYear  = y;
  let startDay  = d <= 14 ? 15 : 1; // next cycle's processing day

  for (let i = 0; i < 3; i++) {
    const procDay = startDay;
    let procMonth = baseMonth;
    let procYear  = baseYear;

    if (procDay === 1) {
      procMonth++;
      if (procMonth > 11) { procMonth = 0; procYear++; }
    }

    const processing = new Date(procYear, procMonth, procDay);
    const cutoffDay  = processing.getDate() === 1
      ? new Date(processing.getFullYear(), processing.getMonth(), 1 - 3)
      : new Date(processing.getFullYear(), processing.getMonth(), 12);

    windows.push({
      cycle: `Cycle ${i + 1}`,
      cutoff: cutoffDay,
      processing,
    });

    // advance to next cycle
    if (startDay === 15) {
      startDay = 1;
    } else {
      startDay = 15;
      baseMonth++;
      if (baseMonth > 11) { baseMonth = 0; baseYear++; }
    }
  }

  return windows;
}

function entryTypeLabel(type: string, note: string | null): { label: string; color: string; bg: string; icon: "in" | "out" | "yield" | "adj" | "trade" } {
  if (type === "deposit")          return { label: "Deposit",          color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-500/10",   icon: "in" };
  if (type === "interest_credit")  return { label: "Yield Credit",     color: "text-[#b08d1a] dark:text-[#f2ca50]", bg: "bg-amber-50 dark:bg-[#f2ca50]/10",   icon: "yield" };
  if (type === "withdrawal")       return { label: "Withdrawal",       color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-500/10",       icon: "out" };
  if (type === "correction")       return { label: "Adjustment",       color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10", icon: "adj" };
  if (type === "trade_pl")         return { label: "Trade P/L",        color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10",     icon: "trade" };
  return                                  { label: type,               color: "text-slate-500 dark:text-[#d0c5af]", bg: "bg-slate-100 dark:bg-white/10",      icon: "adj" };
}

// ── Query hooks ───────────────────────────────────────────────────────────────

function useWalletSummary() {
  return useQuery<WalletSummary>({
    queryKey: ["wallet-summary"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/summary");
      if (!res.ok) throw new Error("Failed to load wallet.");
      return res.json() as Promise<WalletSummary>;
    },
    staleTime: 30_000,
  });
}

function useTransactionHistory(page: number, enabled: boolean) {
  return useQuery<{ entries: LedgerEntry[]; total: number; page: number; pageSize: number }>({
    queryKey: ["wallet-tx-history", page],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/transactions?tab=history&page=${page}`);
      if (!res.ok) throw new Error("Failed to load transactions.");
      return res.json() as Promise<{ entries: LedgerEntry[]; total: number; page: number; pageSize: number }>;
    },
    enabled,
    staleTime: 30_000,
  });
}

function useWithdrawalHistory(enabled: boolean) {
  return useQuery<{ withdrawals: WithdrawalRow[] }>({
    queryKey: ["wallet-tx-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/transactions?tab=withdrawals");
      if (!res.ok) throw new Error("Failed to load withdrawal history.");
      return res.json() as Promise<{ withdrawals: WithdrawalRow[] }>;
    },
    enabled,
    staleTime: 30_000,
  });
}

function useWalletDetails(enabled: boolean) {
  return useQuery<WalletDetails>({
    queryKey: ["wallet-tx-details"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/transactions?tab=details");
      if (!res.ok) throw new Error("Failed to load wallet details.");
      return res.json() as Promise<WalletDetails>;
    },
    enabled,
    staleTime: 60_000,
  });
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden dark:bg-[rgba(20,28,42,0.98)] dark:border dark:border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-[rgba(255,255,255,0.08)]">
          <h3 className="text-base font-bold text-gray-900 dark:text-[#dce3f0]">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors dark:text-white/40 dark:hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Balance card ──────────────────────────────────────────────────────────────

function BalanceCard({ summary, loading }: { summary?: WalletSummary; loading: boolean }) {
  const router  = useRouter();
  const [hidden, setHidden] = useState(false);

  return (
    <div
      className="col-span-12 lg:col-span-4 rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-between"
      style={{ background: "#0a0e14", minHeight: "14rem" }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400 font-medium flex items-center gap-2">
            Total Wallet Balance
            <button
              onClick={() => setHidden((h) => !h)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </span>
          {!loading && summary && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                summary.status === "active"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-amber-500/10 text-amber-400"
              )}
            >
              {summary.status}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            {loading ? "—" : hidden ? "••••••" : fmtUsd(summary?.balance ?? 0)}
          </span>
          <span className="text-xs font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded">USD</span>
        </div>
        <div className="mt-4">
          <p className="text-[10px] text-gray-400">Available Balance</p>
          <p className="text-sm font-bold text-green-400 mt-0.5">
            {loading ? "—" : hidden ? "••••" : fmtUsd(summary?.availableBalance ?? 0)}
          </p>
        </div>
        {!loading && summary && summary.lockedPrincipal > 0 && (
          <div className="mt-2">
            <p className="text-[10px] text-gray-500">Locked Principal</p>
            <p className="text-sm font-semibold text-amber-500 mt-0.5">
              {hidden ? "••••" : fmtUsd(summary.lockedPrincipal)}
            </p>
          </div>
        )}
      </div>

      <div className="absolute right-[-16px] top-4 opacity-[0.07] pointer-events-none">
        <Wallet className="size-36" />
      </div>

      <button
        onClick={() => router.push(ROUTES.WITHDRAW)}
        className="w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all relative z-10 hover:opacity-90 active:scale-[0.98] mt-6"
        style={{ background: "#d4a755", color: "#05070a" }}
      >
        <ArrowUpRight className="size-4" />
        Request Withdrawal
      </button>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  loading,
  onViewDetails,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
  onViewDetails: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col justify-between dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)]">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", iconBg, iconColor)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-white/40">{label}</p>
        <p className="text-xl font-bold text-gray-800 mt-1 dark:text-white">
          {loading ? <span className="inline-block w-20 h-6 rounded bg-slate-100 dark:bg-white/10 animate-pulse" /> : value}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5 dark:text-white/40">{sub}</p>
      </div>
      <button
        onClick={onViewDetails}
        className="text-xs font-bold text-blue-600 mt-4 flex items-center gap-1 hover:underline w-fit dark:text-[#d4a755]"
      >
        View Details <ChevronRight className="size-3" />
      </button>
    </div>
  );
}

// ── Entry icon ────────────────────────────────────────────────────────────────

function EntryIcon({ icon, bg, color }: { icon: "in" | "out" | "yield" | "adj" | "trade"; bg: string; color: string }) {
  const IconComp = {
    in:    ArrowDownLeft,
    out:   ArrowUpRight,
    yield: Zap,
    adj:   FileText,
    trade: ArrowUpRight,
  }[icon];
  return (
    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", bg, color)}>
      <IconComp className="size-3" />
    </div>
  );
}

// ── Transaction table ─────────────────────────────────────────────────────────

const TABS = ["Transaction History", "Withdrawal History", "Wallet Details"];

function TransactionTable({ summary }: { summary?: WalletSummary }) {
  const [activeTab, setActiveTab]   = useState(0);
  const [page, setPage]             = useState(1);

  const historyQuery     = useTransactionHistory(page, activeTab === 0);
  const withdrawalsQuery = useWithdrawalHistory(activeTab === 1);
  const detailsQuery     = useWalletDetails(activeTab === 2);

  const entries     = historyQuery.data?.entries ?? [];
  const totalTx     = historyQuery.data?.total ?? 0;
  const totalPages  = Math.ceil(totalTx / 20);
  const withdrawals = withdrawalsQuery.data?.withdrawals ?? [];

  return (
    <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 overflow-hidden dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)]">
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100 dark:border-[rgba(255,255,255,0.08)]">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(i); setPage(1); }}
            className={cn(
              "shrink-0 px-5 sm:px-8 py-4 text-sm transition-colors",
              activeTab === i
                ? "font-bold text-blue-600 border-b-2 border-blue-600 dark:text-[#d4a755] dark:border-[#d4a755]"
                : "font-medium text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/60"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Transaction History ──────────────────────────────────────────── */}
      {activeTab === 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 dark:bg-[rgba(255,255,255,0.05)] dark:text-white/40">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Note</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50 dark:divide-white/[0.03]">
                {historyQuery.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-white/30 text-sm">
                      Loading…
                    </td>
                  </tr>
                )}
                {!historyQuery.isLoading && entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                          <FileText className="size-5 text-gray-300 dark:text-white/20" />
                        </div>
                        <p className="text-sm font-semibold text-gray-400 dark:text-white/40">No transactions yet</p>
                        <p className="text-xs text-gray-400 dark:text-white/30">
                          Deposits, yield credits, and adjustments will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {entries.map((entry) => {
                  const meta = entryTypeLabel(entry.entryType, entry.note);
                  const isPositive = entry.amount >= 0;
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-5 text-gray-500 font-medium text-xs dark:text-white/40 whitespace-nowrap">
                        {fmtDatetime(entry.createdAt)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <EntryIcon icon={meta.icon} bg={meta.bg} color={meta.color} />
                          <span className="font-semibold text-sm text-gray-700 dark:text-white/80">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-500 text-sm dark:text-white/40 max-w-[140px] truncate">
                        {entry.note ?? "—"}
                      </td>
                      <td className={cn("px-6 py-5 font-bold text-sm text-right", isPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400")}>
                        {isPositive ? "+" : ""}{fmtUsd(entry.amount)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                          Settled
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between dark:bg-white/5 dark:border-[rgba(255,255,255,0.05)]">
            <p className="text-xs text-gray-400 font-medium dark:text-white/40">
              Showing {entries.length} of {totalTx} transactions
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-xs font-bold rounded border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors dark:text-white/60"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-xs text-gray-500 dark:text-white/40">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs font-bold rounded border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors dark:text-white/60"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Withdrawal History ───────────────────────────────────────────── */}
      {activeTab === 1 && (
        <>
          {withdrawalsQuery.isLoading && (
            <div className="py-16 text-center text-gray-400 dark:text-white/30 text-sm">Loading…</div>
          )}
          {!withdrawalsQuery.isLoading && withdrawals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 dark:bg-white/10">
                <ArrowUpRight className="size-6 text-gray-300 dark:text-white/30" />
              </div>
              <p className="text-sm font-semibold text-gray-400 dark:text-white/40">No withdrawal history</p>
              <p className="text-xs text-gray-400 mt-1 dark:text-white/30">
                Approved withdrawal requests will appear here.
              </p>
            </div>
          )}
          {withdrawals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left">
                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 dark:bg-[rgba(255,255,255,0.05)] dark:text-white/40">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-right">Fee</th>
                    <th className="px-6 py-4 text-right">Net</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50 dark:divide-white/[0.03]">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-5 text-gray-500 text-xs font-medium dark:text-white/40 whitespace-nowrap">
                        {fmtDatetime(w.createdAt)}
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-gray-600 dark:text-white/60">
                        {w.reference}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700 dark:text-white/80 capitalize">{w.method}</td>
                      <td className="px-6 py-5 text-right font-bold text-gray-800 dark:text-white">
                        {fmtUsd(w.amountUsd)}
                      </td>
                      <td className="px-6 py-5 text-right text-red-500 dark:text-red-400 text-sm">
                        -{fmtUsd(w.feeUsd)}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-green-600 dark:text-green-400">
                        {fmtUsd(w.netUsd)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded text-[10px] font-bold uppercase",
                            w.status === "approved"
                              ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                              : w.status === "pending"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          )}
                        >
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Wallet Details ───────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <>
          {detailsQuery.isLoading && (
            <div className="py-16 text-center text-gray-400 dark:text-white/30 text-sm">Loading…</div>
          )}
          {detailsQuery.data && (() => {
            const d = detailsQuery.data;
            const rows = [
              { label: "Wallet ID",               value: d.walletId },
              { label: "Status",                  value: d.status },
              { label: "Activated On",            value: d.activatedOn ? fmtDate(d.activatedOn) : "—" },
              { label: "Currency",                value: d.currency },
              { label: "Account Type",            value: d.accountType },
              { label: "Withdrawal Method",       value: d.withdrawalMethod },
              { label: "KYC Level",               value: d.kycLevel },
              { label: "Daily Withdrawal Limit",  value: fmtUsd(d.dailyLimit, 0) },
              { label: "Monthly Withdrawal Limit", value: fmtUsd(d.monthlyLimit, 0) },
            ];
            return (
              <div className="divide-y divide-gray-50 dark:divide-[rgba(255,255,255,0.05)]">
                {rows.map((row) => (
                  <div key={row.label} className="flex justify-between items-center px-6 py-4 text-sm">
                    <span className="text-gray-400 font-medium dark:text-white/40">{row.label}</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ── Sidebar widgets ───────────────────────────────────────────────────────────

function WalletInfoPanel({ summary, loading }: { summary?: WalletSummary; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 bg-blue-600 dark:bg-[#d4a755] rounded-xl flex items-center justify-center">
          <Wallet className="size-5 text-white dark:text-[#05070a]" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-white">Wallet Information</h3>
        </div>
        <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase dark:bg-green-500/10 dark:text-green-400">
          {loading ? "…" : summary?.status ?? "Active"}
        </span>
      </div>
      <div className="space-y-3">
        {[
          ["Wallet Status",  loading ? "…" : (summary?.status ?? "—")],
          ["Activated On",   loading ? "…" : (summary?.activatedOn ? fmtDate(summary.activatedOn) : "—")],
          ["Wallet ID",      loading ? "…" : (summary?.walletId ?? "—")],
          ["Currency",       "USD — US Dollar"],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between items-center text-sm">
            <span className="text-gray-400 dark:text-white/40">{label}</span>
            <span className="font-semibold text-gray-800 dark:text-white">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WithdrawalSchedulePanel({ onView }: { onView: () => void }) {
  const windows = nextWithdrawalWindows();
  const next    = windows[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-50 dark:bg-[#d4a755]/10 rounded-xl flex items-center justify-center">
          <CalendarCheck className="size-5 text-blue-600 dark:text-[#d4a755]" />
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white">Withdrawal Schedule</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed dark:text-white/40">
        Withdrawals are processed on the 1st and 15th of each month.
      </p>
      {next && (
        <div className="text-xs text-gray-500 dark:text-white/40 space-y-1 mb-4">
          <div className="flex justify-between">
            <span>Next cut-off</span>
            <span className="font-semibold text-gray-700 dark:text-white/70">{fmtDate(next.cutoff.toISOString())}</span>
          </div>
          <div className="flex justify-between">
            <span>Processing date</span>
            <span className="font-semibold text-gray-700 dark:text-white/70">{fmtDate(next.processing.toISOString())}</span>
          </div>
        </div>
      )}
      <button
        onClick={onView}
        className="w-full py-2 border border-blue-600 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors dark:border-[#d4a755] dark:text-[#d4a755] dark:hover:bg-[#d4a755]/10"
      >
        View Full Schedule
      </button>
    </div>
  );
}

function NeedHelpPanel() {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-50 dark:bg-[#d4a755]/10 rounded-xl flex items-center justify-center">
          <Headphones className="size-5 text-blue-600 dark:text-[#d4a755]" />
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white">Need Help?</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed dark:text-white/40">
        Our support team is available 24/7 to assist with withdrawals, wallet queries, and account issues.
      </p>
      <button
        onClick={() => router.push(ROUTES.SUPPORT)}
        className="w-full py-2 border border-blue-600 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors dark:border-[#d4a755] dark:text-[#d4a755] dark:hover:bg-[#d4a755]/10"
      >
        Contact Support
      </button>
    </div>
  );
}

// ── Trust badges ──────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  { icon: Shield,     label: "Secure Wallet",   desc: "Your funds are protected with bank-level security." },
  { icon: Zap,        label: "Fast Withdrawal",  desc: "Approved withdrawals are processed quickly." },
  { icon: Smartphone, label: "Easy Access",      desc: "Access your wallet anytime, anywhere." },
  { icon: FileText,   label: "Transparent",      desc: "100% transparency in all transactions." },
];

// ── Modal content blocks ──────────────────────────────────────────────────────

function HowWalletWorksContent() {
  const steps = [
    {
      num: "01", title: "Deposit & Allocation",
      body: "When you make a deposit, $100 is automatically allocated to activate and fund your personal wallet. The remaining balance is placed into your trading account.",
    },
    {
      num: "02", title: "Wallet Balance",
      body: "Your wallet balance is completely separate from your trading account. It is not exposed to any trades or market risk — it is your personal reserve.",
    },
    {
      num: "03", title: "Requesting a Withdrawal",
      body: "You can request a withdrawal from your wallet balance at any time via the 'Request Withdrawal' button. Requests are reviewed and processed on the next scheduled cycle (1st and 15th of the month).",
    },
    {
      num: "04", title: "Processing Time",
      body: "Once approved, withdrawals are processed within 1–3 business days depending on your bank. You will receive a confirmation email when the transfer is initiated.",
    },
    {
      num: "05", title: "Limits & Security",
      body: "Daily withdrawal limit: $10,000. Monthly limit: $50,000. All transactions are encrypted and monitored for unusual activity.",
    },
  ];

  return (
    <div className="space-y-5">
      {steps.map((s) => (
        <div key={s.num} className="flex gap-4">
          <span className="text-[11px] font-black text-blue-600 bg-blue-50 rounded-lg px-2 py-1 h-fit shrink-0 dark:text-[#d4a755] dark:bg-[#d4a755]/10">
            {s.num}
          </span>
          <div>
            <p className="text-sm font-bold text-gray-800 mb-0.5 dark:text-white">{s.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed dark:text-white/40">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LearnMoreContent() {
  return (
    <div className="space-y-4 text-sm text-gray-600 leading-relaxed dark:text-white/60">
      <p>
        Aurum Sovereign Capital requires a{" "}
        <span className="font-bold text-gray-900 dark:text-white">$100 wallet activation fee</span> from
        every investor&apos;s initial deposit. This is a one-time allocation.
      </p>
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2 dark:bg-[#d4a755]/10 dark:border-[#d4a755]/20">
        <p className="font-bold text-blue-800 text-xs uppercase tracking-wider dark:text-[#d4a755]">Why is this required?</p>
        <ul className="space-y-1 text-xs text-blue-700 dark:text-white/60">
          <li>• Covers KYC verification and compliance processing costs</li>
          <li>• Funds your withdrawal reserve — available for immediate withdrawal requests</li>
          <li>• Ensures your account meets the minimum operational balance</li>
        </ul>
      </div>
      <p>
        The $100 remains in your wallet at all times and is fully withdrawable once your account meets
        the withdrawal eligibility criteria (minimum trading period and volume requirements).
      </p>
      <p>
        Your trading capital (the deposit amount minus the $100) is placed directly into the fund and
        begins generating returns from the next trading session.
      </p>
    </div>
  );
}

function DepositDetailsContent({ summary }: { summary?: WalletSummary }) {
  const dep = summary?.latestDeposit;
  const rows = [
    { label: "Total Deposited",       value: fmtUsd(summary?.totalDeposited ?? 0), highlight: false },
    { label: "Wallet Activation Fee", value: "$100.00",                             highlight: false },
    { label: "Active Trading Capital",value: fmtUsd((summary?.totalDeposited ?? 0) - 100), highlight: true },
    { label: "Last Deposit Date",     value: dep?.date ? fmtDate(dep.date) : "—",  highlight: false },
    { label: "Deposit Method",        value: dep?.method ?? "—",                   highlight: false },
    { label: "Deposit Reference",     value: dep?.txReference ?? "—",              highlight: false },
    { label: "Deposit Status",        value: "Completed ✓",                        highlight: false },
  ];
  return (
    <div className="divide-y divide-gray-100 dark:divide-[rgba(255,255,255,0.05)]">
      {rows.map((r) => (
        <div key={r.label} className={cn("flex justify-between py-3 text-sm", r.highlight ? "font-bold" : "")}>
          <span className="text-gray-500 dark:text-white/40">{r.label}</span>
          <span className={cn("font-semibold", r.highlight ? "text-blue-600 dark:text-[#d4a755]" : "text-gray-800 dark:text-white")}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function WithdrawalDetailsContent({ summary }: { summary?: WalletSummary }) {
  const windows = nextWithdrawalWindows();
  const next    = windows[0];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center dark:bg-white/5 dark:border-white/10">
        <p className="text-2xl font-black text-gray-800 dark:text-white">
          {fmtUsd(summary?.totalWithdrawn ?? 0)}
        </p>
        <p className="text-xs text-gray-400 mt-1 dark:text-white/40">Total Withdrawn (All Time)</p>
      </div>
      {(summary?.totalWithdrawn ?? 0) === 0 && (
        <p className="text-xs text-gray-500 leading-relaxed dark:text-white/40">
          No withdrawals have been processed for this account yet. Once you submit a withdrawal request
          and it is approved, a full history with transaction IDs, amounts, and bank references will
          appear here.
        </p>
      )}
      {next && (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center dark:border-white/20">
          <p className="text-xs font-bold text-gray-400 dark:text-white/40">Next Processing Window</p>
          <p className="text-sm font-bold text-gray-800 mt-1 dark:text-white">
            {fmtDate(next.processing.toISOString())}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 dark:text-white/30">
            Cut-off: {fmtDate(next.cutoff.toISOString())} at 11:59 PM UTC
          </p>
        </div>
      )}
    </div>
  );
}

function PendingDetailsContent({ summary }: { summary?: WalletSummary }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center dark:bg-amber-500/10 dark:border-amber-500/20">
        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
          {fmtUsd(summary?.pendingWithdrawals ?? 0)}
        </p>
        <p className="text-xs text-amber-600 mt-1 dark:text-amber-400/60">Pending Withdrawal Requests</p>
      </div>
      {(summary?.pendingWithdrawals ?? 0) === 0 && (
        <p className="text-xs text-gray-500 leading-relaxed dark:text-white/40">
          You have no pending withdrawal requests at this time. When you submit a withdrawal, it will
          appear here with a status of{" "}
          <span className="font-bold text-amber-600 dark:text-amber-400">Pending Review</span> until
          it is approved by the operations team.
        </p>
      )}
      <div className="rounded-xl border border-dashed border-gray-200 p-4 dark:border-white/20">
        <p className="text-xs font-bold text-gray-500 mb-2 dark:text-white/40">Typical Review Timeline</p>
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-white/40">
          <div className="flex justify-between"><span>Submission</span><span className="font-semibold dark:text-white/60">Instant</span></div>
          <div className="flex justify-between"><span>Operations Review</span><span className="font-semibold dark:text-white/60">1–2 business days</span></div>
          <div className="flex justify-between"><span>Bank Transfer</span><span className="font-semibold dark:text-white/60">1–3 business days</span></div>
        </div>
      </div>
    </div>
  );
}

function ScheduleContent() {
  const windows = nextWithdrawalWindows();
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed dark:text-white/40">
        Withdrawals are processed twice a month. Submit your request before the cut-off date to be
        included in that cycle.
      </p>
      <div className="space-y-3">
        {windows.map((s, i) => (
          <div
            key={s.cycle}
            className={cn(
              "rounded-xl border p-4",
              i === 0
                ? "border-blue-200 bg-blue-50 dark:border-[#d4a755]/30 dark:bg-[#d4a755]/10"
                : "border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            )}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-gray-800 dark:text-white">{s.cycle}</p>
              {i === 0 && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full dark:text-[#d4a755] dark:bg-[#d4a755]/20">
                  Next
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 space-y-1 dark:text-white/40">
              <div className="flex justify-between">
                <span>Cut-off</span>
                <span className="font-semibold text-gray-700 dark:text-white/60">{fmtDate(s.cutoff.toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing</span>
                <span className="font-semibold text-gray-700 dark:text-white/60">{fmtDate(s.processing.toISOString())}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

type ModalType =
  | "howWalletWorks"
  | "learnMore"
  | "depositDetails"
  | "withdrawalDetails"
  | "pendingDetails"
  | "schedule"
  | null;

const MODAL_TITLES: Record<Exclude<ModalType, null>, string> = {
  howWalletWorks:    "How Your Wallet Works",
  learnMore:         "Wallet Activation Fee — Learn More",
  depositDetails:    "Total Deposited — Details",
  withdrawalDetails: "Total Withdrawn — Details",
  pendingDetails:    "Pending Requests — Details",
  schedule:          "Withdrawal Processing Schedule",
};

export function WalletPage() {
  const [modal, setModal] = useState<ModalType>(null);

  const { data: summary, isLoading } = useWalletSummary();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 dark:bg-transparent">

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal ? MODAL_TITLES[modal] : ""}
      >
        {modal === "howWalletWorks"    && <HowWalletWorksContent />}
        {modal === "learnMore"         && <LearnMoreContent />}
        {modal === "depositDetails"    && <DepositDetailsContent summary={summary} />}
        {modal === "withdrawalDetails" && <WithdrawalDetailsContent summary={summary} />}
        {modal === "pendingDetails"    && <PendingDetailsContent summary={summary} />}
        {modal === "schedule"          && <ScheduleContent />}
      </Modal>

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">My Wallet</h2>
          <p className="text-sm text-gray-500 mt-1 dark:text-white/40">
            Manage your wallet balance, view transactions, and request withdrawals.
          </p>
        </div>
        <button
          onClick={() => setModal("howWalletWorks")}
          className="flex w-fit items-center gap-2 px-4 py-2 border border-blue-100 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors dark:border-[#d4a755]/30 dark:text-[#d4a755] dark:hover:bg-[#d4a755]/10"
        >
          <CircleHelp className="size-4" />
          How Wallet Works
        </button>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <BalanceCard summary={summary} loading={isLoading} />
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            icon={<ArrowDownLeft className="size-5" />}
            iconBg="bg-blue-50 dark:bg-blue-500/10"
            iconColor="text-blue-500 dark:text-blue-400"
            label="Total Deposited"
            value={fmtUsd(summary?.totalDeposited ?? 0)}
            sub={isLoading ? "…" : (summary?.latestDeposit?.date ? `Last: ${fmtDate(summary.latestDeposit.date)}` : "No deposits yet")}
            loading={isLoading}
            onViewDetails={() => setModal("depositDetails")}
          />
          <StatCard
            icon={<ArrowUpRight className="size-5" />}
            iconBg="bg-green-50 dark:bg-green-500/10"
            iconColor="text-green-500 dark:text-green-400"
            label="Total Withdrawn"
            value={fmtUsd(summary?.totalWithdrawn ?? 0)}
            sub="All time"
            loading={isLoading}
            onViewDetails={() => setModal("withdrawalDetails")}
          />
          <StatCard
            icon={<Clock className="size-5" />}
            iconBg="bg-amber-50 dark:bg-amber-500/10"
            iconColor="text-amber-500 dark:text-amber-400"
            label="Pending Requests"
            value={fmtUsd(summary?.pendingWithdrawals ?? 0)}
            sub={!isLoading && (summary?.pendingWithdrawals ?? 0) > 0 ? "Under review" : "No pending requests"}
            loading={isLoading}
            onViewDetails={() => setModal("pendingDetails")}
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between dark:bg-[#d4a755]/10 dark:border-[#d4a755]/20">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-blue-300 flex items-center justify-center flex-shrink-0 dark:border-[#d4a755]/40">
            <Info className="size-3.5 text-blue-600 dark:text-[#d4a755]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-white/90">
              $100 from your deposit has been allocated to activate your wallet.
            </p>
            <p className="text-xs text-blue-600 mt-0.5 dark:text-white/50">
              This wallet balance is not used for trading. It is for withdrawal and personal use.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal("learnMore")}
          className="text-sm font-bold text-blue-700 hover:underline flex items-center gap-1 whitespace-nowrap sm:ml-6 w-fit dark:text-[#d4a755]"
        >
          Learn More <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/* Lower content grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <TransactionTable summary={summary} />
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <WalletInfoPanel summary={summary} loading={isLoading} />
          <WithdrawalSchedulePanel onView={() => setModal("schedule")} />
          <NeedHelpPanel />
        </div>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-4 pb-12">
        {TRUST_BADGES.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-4 bg-white/50 p-4 rounded-xl border border-gray-100 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)]"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0 dark:bg-[#d4a755]/10 dark:text-[#d4a755]">
              <Icon className="size-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-gray-800 dark:text-white">{label}</h5>
              <p className="text-[10px] text-gray-500 leading-tight dark:text-white/40">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
