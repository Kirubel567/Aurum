"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

type DepositRow = {
  id: string;
  userId: string;
  investorName: string;
  investorEmail: string;
  amountSubmitted: number;
  currencySubmitted: string;
  fxRateApplied: number | null;
  settledAmountUsd: number | null;
  method: string;
  methodDetail: string;
  hasProof: boolean;
  txReference: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  isLegacy: boolean;
};

type DepositDetail = DepositRow & {
  investorUsername: string | null;
  investorPhone: string | null;
  investorCountry: string | null;
  reviewedBy: string | null;
  proofUrl: string | null;
  txHash: string | null;
  metadata: Record<string, unknown> | null;
};

type Stats = { pending: number; approvedToday: number; totalMonthUsd: number };

type ListResponse = { deposits: DepositRow[]; stats: Stats };

// ── Withdrawal types ──────────────────────────────────────────────────────────

type WithdrawalRow = {
  id: string;
  userId: string;
  investorName: string;
  investorEmail: string;
  amountUsd: number;
  feeUsd: number;
  netUsd: number;
  method: string;
  bankName: string;
  accountNumber: string;
  reference: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type WdStats = { pending: number; approvedToday: number; totalMonthUsd: number };
type WdListResponse = { withdrawals: WithdrawalRow[]; stats: WdStats };

// ── Data hooks ────────────────────────────────────────────────────────────────

function useDeposits(status: string) {
  return useQuery<ListResponse>({
    queryKey: ["admin-deposits", status],
    queryFn: async () => {
      const qs = status !== "all" ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/deposits${qs}`);
      if (!res.ok) throw new Error("Failed to load deposits.");
      return res.json() as Promise<ListResponse>;
    },
    refetchInterval: 30_000,
  });
}

function useDepositDetail(id: string | null) {
  return useQuery<{ deposit: DepositDetail }>({
    queryKey: ["admin-deposit-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/deposits/${id}`);
      if (!res.ok) throw new Error("Failed to load deposit details.");
      return res.json() as Promise<{ deposit: DepositDetail }>;
    },
    enabled: !!id,
  });
}

function useWithdrawals(status: string) {
  return useQuery<WdListResponse>({
    queryKey: ["admin-withdrawals", status],
    queryFn: async () => {
      const qs = status !== "all" ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/withdrawals${qs}`);
      if (!res.ok) throw new Error("Failed to load withdrawals.");
      return res.json() as Promise<WdListResponse>;
    },
    refetchInterval: 30_000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}
function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function methodLabel(method: string, detail: string) {
  const map: Record<string, string> = {
    cbe: "CBE", boa: "Bank of Abyssinia", awash: "Awash Bank",
    telebirr: "TeleBirr", cbebirr: "CBE Birr",
    usdt: "USDT", btc: "Bitcoin", eth: "Ethereum",
    wire: "Wire Transfer", westernunion: "Western Union", moneygram: "MoneyGram",
  };
  return map[detail] ?? detail ?? method;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#b08d1a]/20 dark:border-[#f2ca50]/30 text-[#b08d1a] dark:text-[#f2ca50] bg-[#b08d1a]/5 dark:bg-[#f2ca50]/10">Pending</span>
  );
  if (status === "approved") return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#059669]/20 dark:border-[#4edea3]/30 text-[#059669] dark:text-[#4edea3] bg-[#059669]/5 dark:bg-[#4edea3]/10">Approved</span>
  );
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-red-300/30 dark:border-[#ffb4ab]/30 text-red-600 dark:text-[#ffb4ab] bg-red-50 dark:bg-[#ffb4ab]/10">Rejected</span>
  );
}

// ── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({
  deposit,
  onClose,
  onApproved,
}: {
  deposit: DepositDetail;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [fxRate, setFxRate] = useState(
    deposit.currencySubmitted === "USD" ? "1" : ""
  );
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const rate = Number(fxRate);
      if (!rate || rate <= 0) throw new Error("Enter a valid FX rate.");
      const res = await fetch(`/api/admin/deposits/${deposit.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fxRate: rate }),
      });
      const body = await res.json() as { error?: string; requiresFxRate?: boolean };
      if (!res.ok) throw new Error(body.error ?? "Approval failed.");
      return body;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      onApproved();
    },
    onError: (e: Error) => setError(e.message),
  });

  const settled = fxRate && Number(fxRate) > 0
    ? (deposit.amountSubmitted * Number(fxRate)).toFixed(2)
    : "—";

  const gc  = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(255,255,255,0.1)]";
  const gcg = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(212,175,55,0.2)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#0d141d]/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white ${gcg} max-w-md w-full mx-6 p-6 rounded-xl shadow-2xl dark:shadow-none border border-[#b08d1a]/20`}>
        <h4 className="font-headline-md text-headline-md text-[#b08d1a] dark:text-[#f2ca50] mb-1">Approve Deposit</h4>
        <p className="text-xs text-slate-500 dark:text-[#d0c5af] font-data-mono mb-4">
          {deposit.investorName} · {deposit.txReference}
        </p>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-[#d0c5af]">Amount submitted</span>
            <span className="font-bold text-[#0f172a] dark:text-[#dce3f0] font-data-mono">
              {deposit.amountSubmitted.toLocaleString()} {deposit.currencySubmitted}
            </span>
          </div>

          {deposit.currencySubmitted !== "USD" && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#d0c5af] mb-1">
                FX Rate ({deposit.currencySubmitted} → USD)
                <span className="text-slate-400 font-normal ml-1">e.g. 0.0091 for ETB</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.00001"
                value={fxRate}
                onChange={(e) => { setFxRate(e.target.value); setError(""); }}
                className="w-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded px-3 py-2 text-sm font-data-mono text-[#0f172a] dark:text-[#dce3f0] focus:outline-none focus:ring-2 focus:ring-[#b08d1a]/40"
                placeholder="Enter current rate"
              />
            </div>
          )}

          <div className="flex justify-between text-sm pt-1 border-t border-slate-100 dark:border-white/10">
            <span className="text-slate-500 dark:text-[#d0c5af]">Settled (USD)</span>
            <span className="font-bold text-[#059669] dark:text-[#4edea3] font-data-mono">${settled}</span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-[#ffb4ab] mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-[#d0c5af] hover:text-slate-700 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !fxRate}
            className="px-6 py-2 bg-[#059669] dark:bg-[#4edea3] text-white dark:text-[#003824] rounded font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all shadow-md"
          >
            {mutation.isPending ? "Approving…" : "Confirm Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  deposit,
  onClose,
  onRejected,
}: {
  deposit: DepositDetail;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("Please enter a rejection reason.");
      const res = await fetch(`/api/admin/deposits/${deposit.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Rejection failed.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      onRejected();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#0d141d]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md max-w-md w-full mx-6 p-6 rounded-xl shadow-2xl dark:shadow-none border border-red-200 dark:border-[#ffb4ab]/20">
        <h4 className="font-headline-md text-headline-md text-red-600 dark:text-[#ffb4ab] mb-1">Reject Deposit</h4>
        <p className="text-xs text-slate-500 dark:text-[#d0c5af] font-data-mono mb-4">
          {deposit.investorName} · {deposit.txReference}
        </p>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 dark:text-[#d0c5af] mb-1">
            Rejection reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(""); }}
            className="w-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded px-3 py-2 text-sm text-[#0f172a] dark:text-[#dce3f0] focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none"
            placeholder="e.g. Proof document is illegible. Please resubmit a clear receipt."
          />
        </div>

        {error && <p className="text-xs text-red-500 dark:text-[#ffb4ab] mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-[#d0c5af] hover:text-slate-700 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim()}
            className="px-6 py-2 bg-red-600 dark:bg-[#ffb4ab] text-white dark:text-[#3c0000] rounded font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {mutation.isPending ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail / proof modal ──────────────────────────────────────────────────────

function DetailModal({
  depositId,
  onClose,
  onApprove,
  onReject,
  isSuperAdmin,
}: {
  depositId: string;
  onClose: () => void;
  onApprove: (d: DepositDetail) => void;
  onReject: (d: DepositDetail) => void;
  isSuperAdmin: boolean;
}) {
  const { data, isLoading } = useDepositDetail(depositId);
  const deposit = data?.deposit;

  const gcg = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(212,175,55,0.2)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#0d141d]/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white ${gcg} max-w-2xl w-full mx-6 p-6 rounded-xl shadow-2xl dark:shadow-none border border-[#b08d1a]/20 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="font-headline-md text-headline-md text-[#b08d1a] dark:text-[#f2ca50]">
              Transaction Proof Preview
            </h4>
            {deposit && (
              <p className="text-xs text-slate-500 dark:text-[#d0c5af] font-data-mono mt-0.5">
                {deposit.investorName} · {deposit.txReference}
              </p>
            )}
          </div>
          <button
            className="material-symbols-outlined text-slate-500 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors"
            onClick={onClose}
          >
            close
          </button>
        </div>

        {isLoading && (
          <div className="h-40 flex items-center justify-center text-slate-400 dark:text-[#d0c5af] text-sm">
            Loading…
          </div>
        )}

        {deposit && (
          <>
            {/* Proof image / legacy message */}
            <div className="aspect-video w-full bg-slate-100 dark:bg-black rounded border border-slate-200 dark:border-white/10 mb-4 flex items-center justify-center overflow-hidden">
              {deposit.proofUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="w-full h-full object-contain"
                  src={deposit.proofUrl}
                  alt="Transaction proof"
                />
              ) : (
                <div className="p-6 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-white/20 block mb-2">history_edu</span>
                  <p className="text-sm text-slate-500 dark:text-[#d0c5af]">
                    Legacy submission — proof document is stored in the database record<br/>
                    and cannot be previewed here. Review the investor&apos;s profile for details.
                  </p>
                </div>
              )}
            </div>

            {/* Deposit details */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
              {[
                ["Investor",   deposit.investorName],
                ["Email",      deposit.investorEmail],
                ["Method",     methodLabel(deposit.method, deposit.methodDetail)],
                ["Submitted",  `${deposit.amountSubmitted.toLocaleString()} ${deposit.currencySubmitted}`],
                ["Reference",  deposit.txReference],
                ["Date",       fmtDate(deposit.createdAt)],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="text-slate-400 dark:text-[#99907c] text-[10px] uppercase font-bold tracking-wider">{label}</span>
                  <p className="text-[#0f172a] dark:text-[#dce3f0] font-data-mono truncate">{val}</p>
                </div>
              ))}
            </div>

            {deposit.status === "pending" && isSuperAdmin && (
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => onReject(deposit)}
                  className="px-6 py-2 bg-[#dc2626]/10 dark:bg-[#ffb4ab]/10 text-[#dc2626] dark:text-[#ffb4ab] border border-[#dc2626]/20 dark:border-[#ffb4ab]/30 rounded font-bold hover:bg-[#dc2626]/20 dark:hover:bg-[#ffb4ab]/20 transition-all"
                >
                  Reject Proof
                </button>
                <button
                  onClick={() => onApprove(deposit)}
                  className="px-6 py-2 bg-[#059669] dark:bg-[#4edea3] text-white dark:text-[#003824] rounded font-bold hover:brightness-110 transition-all shadow-md"
                >
                  Approve &amp; Release
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Withdrawal Approve Modal ──────────────────────────────────────────────────

function WdApproveModal({
  withdrawal,
  onClose,
  onApproved,
}: {
  withdrawal: WithdrawalRow;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/withdrawals/${withdrawal.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Approval failed.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      onApproved();
    },
    onError: (e: Error) => setError(e.message),
  });

  const gcg = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(212,175,55,0.2)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#0d141d]/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white ${gcg} max-w-md w-full mx-6 p-6 rounded-xl shadow-2xl dark:shadow-none border border-[#b08d1a]/20`}>
        <h4 className="font-headline-md text-headline-md text-[#b08d1a] dark:text-[#f2ca50] mb-1">Approve Withdrawal</h4>
        <p className="text-xs text-slate-500 dark:text-[#d0c5af] font-data-mono mb-4">
          {withdrawal.investorName} · {withdrawal.reference}
        </p>

        <div className="space-y-3 mb-4">
          {[
            ["Investor",    withdrawal.investorName],
            ["Amount",      `$${withdrawal.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
            ["Fee",         `$${withdrawal.feeUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
            ["Net payout",  `$${withdrawal.netUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
            ["Bank",        withdrawal.bankName],
            ["Account",     withdrawal.accountNumber],
            ["Method",      withdrawal.method],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-[#d0c5af]">{label}</span>
              <span className={`font-bold font-data-mono ${label === "Net payout" ? "text-[#059669] dark:text-[#4edea3]" : "text-[#0f172a] dark:text-[#dce3f0]"}`}>{val}</span>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-500 dark:text-[#ffb4ab] mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-[#d0c5af] hover:text-slate-700 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-6 py-2 bg-[#059669] dark:bg-[#4edea3] text-white dark:text-[#003824] rounded font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all shadow-md"
          >
            {mutation.isPending ? "Approving…" : "Confirm Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Withdrawal Reject Modal ───────────────────────────────────────────────────

function WdRejectModal({
  withdrawal,
  onClose,
  onRejected,
}: {
  withdrawal: WithdrawalRow;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("Please enter a rejection reason.");
      const res = await fetch(`/api/admin/withdrawals/${withdrawal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Rejection failed.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      onRejected();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#0d141d]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md max-w-md w-full mx-6 p-6 rounded-xl shadow-2xl dark:shadow-none border border-red-200 dark:border-[#ffb4ab]/20">
        <h4 className="font-headline-md text-headline-md text-red-600 dark:text-[#ffb4ab] mb-1">Reject Withdrawal</h4>
        <p className="text-xs text-slate-500 dark:text-[#d0c5af] font-data-mono mb-4">
          {withdrawal.investorName} · {withdrawal.reference}
        </p>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 dark:text-[#d0c5af] mb-1">
            Rejection reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(""); }}
            className="w-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded px-3 py-2 text-sm text-[#0f172a] dark:text-[#dce3f0] focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none"
            placeholder="e.g. Bank account details do not match KYC records."
          />
        </div>

        {error && <p className="text-xs text-red-500 dark:text-[#ffb4ab] mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-[#d0c5af] hover:text-slate-700 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim()}
            className="px-6 py-2 bg-red-600 dark:bg-[#ffb4ab] text-white dark:text-[#3c0000] rounded font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {mutation.isPending ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Withdrawals section ───────────────────────────────────────────────────────

function WithdrawalsSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [wdStatusFilter, setWdStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [approveWd, setApproveWd] = useState<WithdrawalRow | null>(null);
  const [rejectWd,  setRejectWd]  = useState<WithdrawalRow | null>(null);

  const { data, isLoading, error } = useWithdrawals(wdStatusFilter);
  const withdrawals = data?.withdrawals ?? [];
  const stats = data?.stats;

  const gc  = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(255,255,255,0.1)]";
  const gcg = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(212,175,55,0.2)]";

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className={`glass-card ${gc} p-6 rounded-xl flex flex-col gap-2`}>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af]">TOTAL WITHDRAWN (MONTH)</span>
            <span className="material-symbols-outlined text-[#b08d1a] dark:text-[#f2ca50]">account_balance</span>
          </div>
          <span className="font-display-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">
            {isLoading ? "—" : fmtUsd(stats?.totalMonthUsd ?? 0)}
          </span>
        </div>

        <div className={`glass-card-gold ${gcg} p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden`}>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-[#b08d1a] dark:text-[#f2ca50] font-bold">PENDING WITHDRAWALS</span>
            <span className="material-symbols-outlined text-[#b08d1a] dark:text-[#f2ca50]">hourglass_empty</span>
          </div>
          <span className="font-display-lg text-headline-lg text-[#b08d1a] dark:text-[#f2ca50]">
            {isLoading ? "—" : (stats?.pending ?? 0)}
          </span>
          <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] italic">
            {(stats?.pending ?? 0) > 0 ? "Awaiting review" : "All clear"}
          </p>
        </div>

        <div className={`glass-card ${gc} p-6 rounded-xl flex flex-col gap-2`}>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af]">APPROVED TODAY</span>
            <span className="material-symbols-outlined text-[#059669] dark:text-[#4edea3]">verified</span>
          </div>
          <span className="font-display-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">
            {isLoading ? "—" : (stats?.approvedToday ?? 0)}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-[#ffb4ab]/10 border border-red-200 dark:border-[#ffb4ab]/20 rounded-xl text-red-600 dark:text-[#ffb4ab] text-sm">
          Failed to load withdrawals. Please refresh the page.
        </div>
      )}

      {/* Table */}
      <section className={`glass-card ${gc} rounded-xl overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase tracking-[0.1em]">
            Withdrawal Requests
          </h3>
          <div className="flex gap-1">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button key={s} onClick={() => setWdStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border capitalize transition-colors ${
                  wdStatusFilter === s
                    ? "bg-[#b08d1a]/10 dark:bg-[#f2ca50]/20 border-[#b08d1a]/30 dark:border-[#f2ca50]/40 text-[#b08d1a] dark:text-[#f2ca50]"
                    : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#d0c5af] hover:bg-slate-50 dark:hover:bg-white/5"
                }`}>{s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af] border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-transparent">
                <th className="px-6 py-4 font-bold">INVESTOR</th>
                <th className="px-6 py-4 font-bold text-right">AMOUNT</th>
                <th className="px-6 py-4 font-bold">BANK</th>
                <th className="px-6 py-4 font-bold">METHOD</th>
                <th className="px-6 py-4 font-bold">DATE</th>
                <th className="px-6 py-4 font-bold">STATUS</th>
                {isSuperAdmin && <th className="px-6 py-4 font-bold text-center">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-[#d0c5af] text-sm">
                    Loading withdrawals…
                  </td>
                </tr>
              )}
              {!isLoading && withdrawals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-[#d0c5af] text-sm">
                    No {wdStatusFilter !== "all" ? wdStatusFilter : ""} withdrawals.
                  </td>
                </tr>
              )}
              {withdrawals.map((wd) => (
                <tr key={wd.id} className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-colors ${wd.status !== "pending" ? "opacity-60" : ""}`}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{wd.investorName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-data-mono">{wd.reference}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-data-mono font-bold text-[#b08d1a] dark:text-[#f2ca50]">
                      {fmtUsd(wd.amountUsd)}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-[#99907c] font-data-mono">
                      net {fmtUsd(wd.netUsd)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-body-sm text-[#0f172a] dark:text-[#dce3f0]">{wd.bankName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-data-mono">{wd.accountNumber}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                      wd.method === "express"
                        ? "bg-[#b08d1a]/5 dark:bg-[#f2ca50]/10 text-[#b08d1a] dark:text-[#f2ca50] border-[#b08d1a]/20 dark:border-[#f2ca50]/30"
                        : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#d0c5af] border-slate-200 dark:border-white/10"
                    }`}>{wd.method}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-body-sm text-[#0f172a] dark:text-[#dce3f0]">{fmtDate(wd.createdAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={wd.status} />
                    {wd.status === "rejected" && wd.rejectionReason && (
                      <p className="text-[10px] text-slate-400 dark:text-[#99907c] mt-0.5 max-w-[120px] truncate" title={wd.rejectionReason}>
                        {wd.rejectionReason}
                      </p>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4">
                      {wd.status === "pending" ? (
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => setApproveWd(wd)}
                            className="material-symbols-outlined text-[#059669] dark:text-[#4edea3] hover:bg-[#059669]/10 dark:hover:bg-[#4edea3]/20 p-1.5 rounded transition-all"
                            title="Approve withdrawal"
                          >check_circle</button>
                          <button
                            onClick={() => setRejectWd(wd)}
                            className="material-symbols-outlined text-[#dc2626] dark:text-[#ffb4ab] hover:bg-[#dc2626]/10 dark:hover:bg-[#ffb4ab]/20 p-1.5 rounded transition-all"
                            title="Reject withdrawal"
                          >cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-label-caps font-bold">PROCESSED</span>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
          <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">
            Showing <span className="text-[#0f172a] dark:text-[#dce3f0] font-bold">{withdrawals.length}</span> withdrawal{withdrawals.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {approveWd && (
        <WdApproveModal
          withdrawal={approveWd}
          onClose={() => setApproveWd(null)}
          onApproved={() => setApproveWd(null)}
        />
      )}
      {rejectWd && (
        <WdRejectModal
          withdrawal={rejectWd}
          onClose={() => setRejectWd(null)}
          onRejected={() => setRejectWd(null)}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DepositVerificationPage() {
  const [pageSection, setPageSection] = useState<"deposits" | "withdrawals">("deposits");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [activeTab,    setActiveTab]    = useState<"Active" | "Resolved">("Active");
  const [detailId,     setDetailId]     = useState<string | null>(null);
  const [approveDeposit, setApproveDeposit] = useState<DepositDetail | null>(null);
  const [rejectDeposit,  setRejectDeposit]  = useState<DepositDetail | null>(null);
  const [filterOpen,     setFilterOpen]     = useState(false);

  // Pass "all" to the query so we always have stats; local tab filtering applies client-side
  const { data, isLoading, error } = useDeposits("all");
  const deposits = data?.deposits ?? [];
  const stats    = data?.stats;

  // We'll read the session role from a cookie header check via /api/auth/session
  // For now, use the existing pattern from other admin pages
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  // Quick role check on mount
  useState(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((b: { session?: { user?: { role?: string } } }) => {
        if (b.session?.user?.role === "super_admin") setIsSuperAdmin(true);
      })
      .catch(() => {/* noop */});
  });

  const displayed = deposits.filter((d) => {
    const tabMatch = activeTab === "Active" ? d.status === "pending" : d.status !== "pending";
    const filterMatch = statusFilter === "all" || d.status === statusFilter;
    return tabMatch && filterMatch;
  });

  const gc  = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(255,255,255,0.1)]";
  const gcg = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(212,175,55,0.2)]";

  return (
    <main className="px-4 sm:p-6 max-w-[1440px] h-full overflow-y-auto pt-6 dark:bg-[#050b14]">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">
            {pageSection === "deposits" ? "Deposit Verification" : "Withdrawal Management"}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b08d1a] dark:bg-[#f2ca50] animate-pulse" />
            <p className="text-slate-500 dark:text-[#d0c5af] font-data-mono uppercase tracking-widest text-xs">
              {isLoading ? "Loading…" : `${stats?.pending ?? 0} Pending Requests Requiring Review`}
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {/* Deposits / Withdrawals toggle */}
          <div className="flex bg-slate-100/80 dark:bg-[#080f18] border border-slate-200 dark:border-white/10 rounded-lg p-0.5">
            {(["deposits", "withdrawals"] as const).map((sec) => (
              <button
                key={sec}
                onClick={() => setPageSection(sec)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${
                  pageSection === sec
                    ? "bg-[#b08d1a] dark:bg-[#f2ca50]/20 text-white dark:text-[#f2ca50]"
                    : "text-slate-500 dark:text-[#d0c5af] hover:text-[#0f172a] dark:hover:text-[#dce3f0]"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
          {pageSection === "deposits" && <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`flex items-center gap-2 border px-4 py-2 rounded text-body-sm transition-all shadow-sm dark:shadow-none ${
                filterOpen || statusFilter !== "all"
                  ? "bg-[#b08d1a]/10 dark:bg-[#f2ca50]/10 border-[#b08d1a]/40 dark:border-[#f2ca50]/40 text-[#b08d1a] dark:text-[#f2ca50]"
                  : "bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dce3f0] hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filter {statusFilter !== "all" && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#b08d1a] dark:bg-[#f2ca50] inline-block" />}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[rgba(25,32,42,0.95)] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-none z-50 p-4 space-y-2 backdrop-blur-md">
                <p className="text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-1">
                  {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                    <button key={s} onClick={() => { setStatusFilter(s); setFilterOpen(false); }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border capitalize transition-colors ${
                        statusFilter === s
                          ? "bg-[#b08d1a]/10 dark:bg-[#f2ca50]/20 border-[#b08d1a]/30 dark:border-[#f2ca50]/40 text-[#b08d1a] dark:text-[#f2ca50]"
                          : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#d0c5af] hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}>{s}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setStatusFilter("all"); setFilterOpen(false); }}
                  className="w-full text-[10px] font-bold text-slate-400 dark:text-[#99907c] hover:text-slate-600 dark:hover:text-[#d0c5af] text-center pt-2 border-t border-slate-100 dark:border-white/5 transition-colors">
                  Clear filter
                </button>
              </div>
            )}
          </div>}
        </div>
      </header>

      {pageSection === "withdrawals" && <WithdrawalsSection isSuperAdmin={isSuperAdmin} />}

      {pageSection === "deposits" && <>
      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className={`glass-card ${gc} p-6 rounded-xl flex flex-col gap-2`}>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af]">TOTAL DEPOSITS (MONTH)</span>
            <span className="material-symbols-outlined text-[#b08d1a] dark:text-[#f2ca50]">account_balance_wallet</span>
          </div>
          <span className="font-display-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">
            {isLoading ? "—" : fmtUsd(stats?.totalMonthUsd ?? 0)}
          </span>
        </div>

        <div className={`glass-card-gold ${gcg} p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden`}>
          <div className="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-9xl text-[#b08d1a] dark:text-[#f2ca50]">pending_actions</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-[#b08d1a] dark:text-[#f2ca50] font-bold">PENDING PROOFS</span>
            <span className="material-symbols-outlined text-[#b08d1a] dark:text-[#f2ca50]">hourglass_empty</span>
          </div>
          <span className="font-display-lg text-headline-lg text-[#b08d1a] dark:text-[#f2ca50]">
            {isLoading ? "—" : (stats?.pending ?? 0)}
          </span>
          <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] italic">
            {(stats?.pending ?? 0) > 0 ? "Awaiting review" : "All clear"}
          </p>
        </div>

        <div className={`glass-card ${gc} p-6 rounded-xl flex flex-col gap-2`}>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af]">APPROVED TODAY</span>
            <span className="material-symbols-outlined text-[#059669] dark:text-[#4edea3]">verified</span>
          </div>
          <span className="font-display-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">
            {isLoading ? "—" : (stats?.approvedToday ?? 0)}
          </span>
        </div>
      </div>

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-[#ffb4ab]/10 border border-red-200 dark:border-[#ffb4ab]/20 rounded-xl text-red-600 dark:text-[#ffb4ab] text-sm">
          Failed to load deposits. Please refresh the page.
        </div>
      )}

      {/* ── Main data table ──────────────────────────────────────────────── */}
      <section className={`glass-card ${gc} rounded-xl overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase tracking-[0.1em]">
            User Deposit Proofs
          </h3>
          <div className="flex bg-slate-100/50 dark:bg-[#080f18] border border-slate-200 dark:border-white/10 rounded p-0.5">
            {(["Active", "Resolved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  activeTab === tab
                    ? "bg-[#b08d1a] dark:bg-[#f2ca50]/20 text-white dark:text-[#f2ca50]"
                    : "text-slate-500 dark:text-[#d0c5af] hover:text-[#0f172a] dark:hover:text-[#dce3f0]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af] border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-transparent">
                <th className="px-6 py-4 font-bold">INVESTOR</th>
                <th className="px-6 py-4 font-bold">METHOD</th>
                <th className="px-6 py-4 font-bold text-right">AMOUNT</th>
                <th className="px-6 py-4 font-bold">DATE</th>
                <th className="px-6 py-4 font-bold">PROOF</th>
                <th className="px-6 py-4 font-bold">STATUS</th>
                {isSuperAdmin && <th className="px-6 py-4 font-bold text-center">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-[#d0c5af] text-sm">
                    Loading deposits…
                  </td>
                </tr>
              )}
              {!isLoading && displayed.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-[#d0c5af] text-sm">
                    No {activeTab.toLowerCase()} deposits.
                  </td>
                </tr>
              )}
              {displayed.map((dep) => {
                const resolved = dep.status !== "pending";
                return (
                  <tr
                    key={dep.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-colors group ${resolved ? "opacity-60" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{dep.investorName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-data-mono">{dep.txReference}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-body-sm text-[#0f172a] dark:text-[#dce3f0]">
                        {methodLabel(dep.method, dep.methodDetail)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-data-mono font-bold text-[#b08d1a] dark:text-[#f2ca50]">
                        {dep.amountSubmitted.toLocaleString()} {dep.currencySubmitted}
                      </span>
                      {dep.settledAmountUsd != null && dep.currencySubmitted !== "USD" && (
                        <p className="text-[10px] text-slate-400 dark:text-[#99907c] font-data-mono">
                          ≈ {fmtUsd(dep.settledAmountUsd)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-body-sm text-[#0f172a] dark:text-[#dce3f0]">{fmtDate(dep.createdAt)}</p>
                      <p className="text-[11px] text-slate-500 dark:text-[#d0c5af] font-data-mono">{fmtTime(dep.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {dep.hasProof ? (
                        <button
                          onClick={() => setDetailId(dep.id)}
                          className="flex items-center gap-2 text-[#b08d1a] dark:text-[#f2ca50] hover:underline group-hover:translate-x-1 transition-transform"
                        >
                          <span className="material-symbols-outlined text-md">visibility</span>
                          <span className="text-xs uppercase font-bold tracking-widest">Preview</span>
                        </button>
                      ) : dep.isLegacy ? (
                        <button
                          onClick={() => setDetailId(dep.id)}
                          className="flex items-center gap-2 text-slate-400 dark:text-[#d0c5af] hover:underline"
                        >
                          <span className="material-symbols-outlined text-md">history_edu</span>
                          <span className="text-xs uppercase font-bold tracking-widest">Legacy</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-[#d0c5af]">No proof</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={dep.status} />
                      {dep.status === "rejected" && dep.rejectionReason && (
                        <p className="text-[10px] text-slate-400 dark:text-[#99907c] mt-0.5 max-w-[120px] truncate" title={dep.rejectionReason}>
                          {dep.rejectionReason}
                        </p>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        {dep.status === "pending" ? (
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setDetailId(dep.id)}
                              className="material-symbols-outlined text-[#059669] dark:text-[#4edea3] hover:bg-[#059669]/10 dark:hover:bg-[#4edea3]/20 p-1.5 rounded transition-all"
                              title="Review & Approve"
                            >
                              check_circle
                            </button>
                            <button
                              onClick={() => setDetailId(dep.id)}
                              className="material-symbols-outlined text-[#dc2626] dark:text-[#ffb4ab] hover:bg-[#dc2626]/10 dark:hover:bg-[#ffb4ab]/20 p-1.5 rounded transition-all"
                              title="Review & Reject"
                            >
                              cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <span className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-label-caps font-bold">PROCESSED</span>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between">
          <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">
            Showing <span className="text-[#0f172a] dark:text-[#dce3f0] font-bold">{displayed.length}</span> {activeTab.toLowerCase()} deposit{displayed.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {/* ── Detail / proof modal ──────────────────────────────────────────── */}
      {detailId && (
        <DetailModal
          depositId={detailId}
          onClose={() => setDetailId(null)}
          isSuperAdmin={isSuperAdmin}
          onApprove={(d) => { setDetailId(null); setApproveDeposit(d); }}
          onReject={(d)  => { setDetailId(null); setRejectDeposit(d); }}
        />
      )}

      {/* ── Approve modal ────────────────────────────────────────────────── */}
      {approveDeposit && (
        <ApproveModal
          deposit={approveDeposit}
          onClose={() => setApproveDeposit(null)}
          onApproved={() => setApproveDeposit(null)}
        />
      )}

      {/* ── Reject modal ─────────────────────────────────────────────────── */}
      {rejectDeposit && (
        <RejectModal
          deposit={rejectDeposit}
          onClose={() => setRejectDeposit(null)}
          onRejected={() => setRejectDeposit(null)}
        />
      )}
      </>}
    </main>
  );
}
