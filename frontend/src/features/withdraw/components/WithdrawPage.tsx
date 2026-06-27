"use client";

import { Fragment, useState } from "react";
import { useNotificationStore } from "@/src/store/notification.store";
import {
  submitWithdrawal,
  FEE_RATE,
  MIN_WITHDRAW,
  PROCESSING_DAYS,
} from "@/src/services/api/withdraw.api";
import { useWithdraw } from "../hooks/useWithdraw";
import type {
  WithdrawFormState,
  WithdrawHistoryItem,
  WithdrawMethod,
  WithdrawStatus,
} from "@/src/types/withdraw.types";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_CONFIG: Record<WithdrawStatus, { label: string; classes: string }> = {
  pending:    { label: "Pending",    classes: "bg-amber-50 text-amber-700 border border-amber-200" },
  processing: { label: "Processing", classes: "bg-blue-50 text-blue-700 border border-blue-200" },
  approved:   { label: "Approved",   classes: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  completed:  { label: "Completed",  classes: "bg-green-50 text-green-700 border border-green-200" },
  rejected:   { label: "Rejected",   classes: "bg-red-50 text-red-700 border border-red-200" },
};

const PRESETS = [500, 1000, 2500, 5000];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 border shadow-sm flex flex-col gap-2 ${
        highlight
          ? "bg-[#050B14] border-[#1e2d42]"
          : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1 ${
          highlight ? "bg-[#e9c349]/15" : "bg-slate-100"
        }`}
      >
        <span
          className={`material-symbols-outlined text-[20px] ${
            highlight ? "text-[#e9c349]" : "text-[#050B14]"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className={`text-[12px] font-semibold uppercase tracking-wider ${highlight ? "text-slate-400" : "text-[#64748B]"}`}>
        {label}
      </p>
      <p className={`text-2xl font-extrabold ${highlight ? "text-[#e9c349]" : "text-[#050B14]"}`}>{value}</p>
      {sub && <p className={`text-[11px] ${highlight ? "text-slate-500" : "text-[#64748B]"}`}>{sub}</p>}
    </div>
  );
}

// ── Confirmation Modal ─────────────────────────────────────────────────────────

function ConfirmModal({
  amount,
  fee,
  net,
  bankName,
  accountNumber,
  method,
  note,
  onConfirm,
  onCancel,
  submitting,
}: {
  amount: number;
  fee: number;
  net: number;
  bankName: string;
  accountNumber: string;
  method: WithdrawMethod;
  note: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#050B14] p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e9c349]/15 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#e9c349]">outbox</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Confirm Withdrawal</h3>
            <p className="text-slate-400 text-[12px]">Please review before submitting</p>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 space-y-3">
          {[
            { label: "Withdrawal Amount", value: fmt(amount), bold: true },
            { label: "Processing Fee", value: `-${fmt(fee)}`, note: `(${method === "express" ? "1%" : "0.5%"})` },
            { label: "Destination Bank", value: bankName },
            { label: "Account Number", value: accountNumber },
            { label: "Processing Time", value: PROCESSING_DAYS[method] },
          ].map(({ label, value, bold, note }) => (
            <div key={label} className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0">
              <span className="text-[13px] text-[#64748B]">{label}</span>
              <span className={`text-[13px] text-right ${bold ? "font-bold text-[#050B14]" : "text-[#050B14]"}`}>
                {value}
                {note && <span className="text-[#64748B] ml-1 text-[11px]">{note}</span>}
              </span>
            </div>
          ))}

          {/* Net line */}
          <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-[#050B14]">
            <span className="text-[14px] font-bold text-[#050B14]">You Will Receive</span>
            <span className="text-xl font-extrabold text-green-600">{fmt(net)}</span>
          </div>

          {note && (
            <div className="bg-slate-50 rounded-xl p-3 text-[12px] text-[#64748B] border border-slate-200">
              <span className="font-semibold text-[#050B14]">Note: </span>{note}
            </div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5 shrink-0">warning</span>
            <p className="text-[11px] text-amber-800">
              Withdrawal requests cannot be cancelled once submitted. Funds will be transferred to your registered bank account.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-[14px] font-semibold text-[#64748B] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-3 bg-[#050B14] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60 shadow-lg"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send_money</span>
                Confirm Withdrawal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success Banner ─────────────────────────────────────────────────────────────

function SuccessBanner({ reference, onDismiss }: { reference: string; onDismiss: () => void }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-green-600">check_circle</span>
        </div>
        <div>
          <p className="font-bold text-green-800">Withdrawal Request Submitted</p>
          <p className="text-[13px] text-green-700 mt-0.5">
            Reference: <span className="font-semibold">{reference}</span> · Our team will process your request within 1–3 business days.
          </p>
        </div>
      </div>
      <button onClick={onDismiss} className="text-green-500 hover:text-green-700 shrink-0">
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  );
}

// ── History Table ──────────────────────────────────────────────────────────────

function HistoryTable({ items }: { items: WithdrawHistoryItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">outbox</span>
        <p className="text-[#64748B] text-sm">No withdrawal history yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[#e9c349] text-[18px]">history</span>
          </div>
          <h3 className="text-[15px] font-bold text-[#050B14]">Withdrawal History</h3>
        </div>
        <span className="text-[12px] text-[#64748B]">{items.length} transaction{items.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-[#64748B] border-b border-slate-100">
              <th className="px-6 py-4 font-semibold">Reference</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Destination</th>
              <th className="px-6 py-4 font-semibold">Method</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Net Received</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const cfg = STATUS_CONFIG[item.status];
              const open = expanded === item.id;
              return (
                <Fragment key={item.id}>
                  <tr
                    onClick={() => setExpanded(open ? null : item.id)}
                    className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-[13px] font-semibold text-[#050B14]">{item.id}</td>
                    <td className="px-6 py-4 text-[13px] text-[#64748B]">{item.date}</td>
                    <td className="px-6 py-4 text-[13px] font-bold text-[#050B14]">{fmt(item.amount)}</td>
                    <td className="px-6 py-4 text-[13px] text-[#64748B] max-w-[160px] truncate">{item.bankName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${
                        item.method === "express"
                          ? "bg-[#e9c349]/15 text-[#050B14]"
                          : "bg-slate-100 text-[#64748B]"
                      }`}>
                        {item.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.classes}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[13px] font-bold text-green-600">{fmt(item.netAmount)}</td>
                  </tr>
                  {open && (
                    <tr key={`${item.id}-detail`} className="bg-slate-50/50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
                          {[
                            { label: "Account Number", value: item.destination },
                            { label: "Processing Fee", value: fmt(item.fee) },
                            { label: "Est. Arrival", value: item.estimatedArrival },
                            { label: "Reference", value: item.reference },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[#64748B] mb-1">{label}</p>
                              <p className="font-semibold text-[#050B14]">{value}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function WithdrawPage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const { data, loading, addToHistory } = useWithdraw();

  const [form, setForm] = useState<WithdrawFormState>({
    amount: "",
    bankId: "",
    method: "standard",
    note: "",
  });
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [amountError, setAmountError] = useState("");

  // Derived
  const parsedAmount = parseFloat(form.amount) || 0;
  const feeRate = FEE_RATE[form.method];
  const fee = parsedAmount * feeRate;
  const net = parsedAmount - fee;
  const selectedBank = data?.banks.find((b) => b.id === form.bankId) ?? data?.banks[0] ?? null;

  const validate = (): boolean => {
    if (!parsedAmount || parsedAmount < MIN_WITHDRAW) {
      setAmountError(`Minimum withdrawal is ${fmt(MIN_WITHDRAW)}`);
      return false;
    }
    if (data && parsedAmount > data.balance.availableToWithdraw) {
      setAmountError(`Exceeds available balance of ${fmt(data.balance.availableToWithdraw)}`);
      return false;
    }
    if (data && parsedAmount > data.balance.dailyLimit - data.balance.dailyUsed) {
      setAmountError("Exceeds daily withdrawal limit");
      return false;
    }
    setAmountError("");
    return true;
  };

  const handleRequestWithdraw = () => {
    if (!validate()) return;
    if (!selectedBank) {
      addToast({ title: "No bank selected", description: "Please add a withdrawal bank account in Profile Settings.", variant: "error" });
      return;
    }
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await submitWithdrawal({
        amount: parsedAmount,
        bankId: selectedBank!.id,
        method: form.method,
        note: form.note,
      });

      const historyItem: WithdrawHistoryItem = {
        id: res.id,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        amount: parsedAmount,
        fee,
        netAmount: net,
        destination: selectedBank!.accountNumber,
        bankName: selectedBank!.bankName,
        method: form.method,
        status: "pending",
        reference: res.reference,
        estimatedArrival: form.method === "express"
          ? new Date(Date.now() + 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      addToHistory(historyItem);
      setConfirming(false);
      setSuccessRef(res.reference);
      setForm({ amount: "", bankId: form.bankId, method: "standard", note: "" });
      addToast({ title: "Withdrawal submitted", description: `Reference: ${res.reference}`, variant: "success" });
    } catch {
      addToast({ title: "Submission failed", description: "Please try again or contact support.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[#e9c349]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#64748B] text-sm">Loading withdrawal portal…</p>
        </div>
      </div>
    );
  }

  const { balance, banks, history } = data;
  const activeBank = form.bankId ? banks.find((b) => b.id === form.bankId) ?? selectedBank : selectedBank;
  const dailyRemaining = balance.dailyLimit - balance.dailyUsed;
  const monthlyRemaining = balance.monthlyLimit - balance.withdrawnThisMonth;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      {/* Confirm modal */}
      {confirming && activeBank && (
        <ConfirmModal
          amount={parsedAmount}
          fee={fee}
          net={net}
          bankName={activeBank.bankName}
          accountNumber={activeBank.accountNumber}
          method={form.method}
          note={form.note}
          onConfirm={handleConfirm}
          onCancel={() => !submitting && setConfirming(false)}
          submitting={submitting}
        />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#050B14] mb-1">Withdraw Funds</h1>
          <p className="text-sm text-[#64748B]">Transfer your available balance to a registered bank account.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[12px] font-semibold text-green-700">Withdrawals Active</span>
        </div>
      </div>

      {/* Success banner */}
      {successRef && (
        <SuccessBanner reference={successRef} onDismiss={() => setSuccessRef(null)} />
      )}

      {/* Balance stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="account_balance_wallet" label="Total Balance" value={fmt(balance.totalBalance)} highlight />
        <StatCard icon="payments" label="Available to Withdraw" value={fmt(balance.availableToWithdraw)} sub="After lock-up" />
        <StatCard icon="pending" label="Pending Withdrawals" value={fmt(balance.pendingWithdrawals)} sub={balance.pendingWithdrawals > 0 ? "Processing" : "None active"} />
        <StatCard icon="outbox" label="Total Withdrawn" value={fmt(balance.totalWithdrawn)} sub="All time" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* ── Left: Form (8 cols) ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#e9c349] text-[20px]">outbox</span>
              </div>
              <h2 className="text-[16px] font-bold text-[#050B14]">Withdrawal Request</h2>
            </div>

            <div className="space-y-6">
              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold text-[#050B14]">Withdrawal Amount</label>
                  <span className="text-[12px] text-[#64748B]">
                    Available: <span className="font-bold text-[#050B14]">{fmt(balance.availableToWithdraw)}</span>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-bold text-lg">$</span>
                  <input
                    type="number"
                    min={MIN_WITHDRAW}
                    max={balance.availableToWithdraw}
                    value={form.amount}
                    onChange={(e) => { setForm({ ...form, amount: e.target.value }); setAmountError(""); }}
                    placeholder="0.00"
                    className={`w-full h-14 pl-9 pr-4 rounded-xl border text-xl font-bold text-[#050B14] outline-none transition-all focus:ring-2 focus:ring-[#e9c349] ${
                      amountError ? "border-red-400 bg-red-50/30" : "border-slate-200"
                    }`}
                  />
                  <button
                    onClick={() => setForm({ ...form, amount: String(balance.availableToWithdraw) })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#e9c349] hover:text-[#c8a832] transition-colors"
                  >
                    MAX
                  </button>
                </div>
                {amountError && (
                  <p className="mt-1.5 text-[12px] text-red-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {amountError}
                  </p>
                )}
                {/* Quick presets */}
                <div className="flex gap-2 mt-3">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setForm({ ...form, amount: String(p) }); setAmountError(""); }}
                      disabled={p > balance.availableToWithdraw}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all disabled:opacity-40 ${
                        parsedAmount === p
                          ? "bg-[#050B14] text-white border-[#050B14]"
                          : "bg-slate-50 text-[#050B14] border-slate-200 hover:border-[#050B14]"
                      }`}
                    >
                      ${p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Bank */}
              <div>
                <label className="block text-[13px] font-semibold text-[#050B14] mb-2">Destination Bank Account</label>
                {banks.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-xl p-5 text-center text-[13px] text-[#64748B]">
                    No bank accounts saved.{" "}
                    <a href="/profile" className="text-[#050B14] font-bold underline">Add one in Profile Settings</a>.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {banks.map((bank) => {
                      const selected = (form.bankId || banks.find((b) => b.isPrimary)?.id || banks[0].id) === bank.id;
                      return (
                        <label
                          key={bank.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                            selected
                              ? "border-[#e9c349] bg-[#e9c349]/5 ring-1 ring-[#e9c349]/30"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="bank"
                            value={bank.id}
                            checked={selected}
                            onChange={() => setForm({ ...form, bankId: bank.id })}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selected ? "border-[#e9c349]" : "border-slate-300"
                            }`}
                          >
                            {selected && <div className="w-2.5 h-2.5 bg-[#e9c349] rounded-full" />}
                          </div>
                          <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#e9c349] text-[18px]">account_balance</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[#050B14] truncate">{bank.bankName}</p>
                            <p className="text-[12px] text-[#64748B]">{bank.accountHolder} · {bank.accountNumber}</p>
                          </div>
                          {bank.isPrimary && (
                            <span className="text-[10px] bg-[#050B14] text-[#e9c349] px-2 py-0.5 rounded-full font-bold shrink-0">
                              Primary
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Processing Speed */}
              <div>
                <label className="block text-[13px] font-semibold text-[#050B14] mb-2">Processing Speed</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["standard", "express"] as WithdrawMethod[]).map((m) => {
                    const selected = form.method === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setForm({ ...form, method: m })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selected
                            ? "border-[#050B14] bg-[#050B14]"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[13px] font-bold capitalize ${selected ? "text-white" : "text-[#050B14]"}`}>
                            {m}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            selected ? "bg-[#e9c349]/20 text-[#e9c349]" : "bg-slate-100 text-[#64748B]"
                          }`}>
                            {m === "standard" ? "0.5% fee" : "1.0% fee"}
                          </span>
                        </div>
                        <p className={`text-[11px] ${selected ? "text-slate-300" : "text-[#64748B]"}`}>
                          {PROCESSING_DAYS[m]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[13px] font-semibold text-[#050B14] mb-2">
                  Reference Note <span className="text-[#64748B] font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Add a note for your records…"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e9c349] outline-none text-[13px] text-[#050B14] resize-none transition-all"
                />
              </div>

              {/* Fee Breakdown */}
              {parsedAmount > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
                  <h4 className="text-[12px] font-bold text-[#050B14] uppercase tracking-wider mb-3">Fee Breakdown</h4>
                  {[
                    { label: "Withdrawal Amount", value: fmt(parsedAmount) },
                    { label: `Processing Fee (${form.method === "express" ? "1%" : "0.5%"})`, value: `-${fmt(fee)}`, muted: true },
                  ].map(({ label, value, muted }) => (
                    <div key={label} className="flex justify-between text-[13px]">
                      <span className={muted ? "text-[#64748B]" : "text-[#050B14]"}>{label}</span>
                      <span className={muted ? "text-[#64748B]" : "font-semibold text-[#050B14]"}>{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-300 pt-3 flex justify-between">
                    <span className="text-[14px] font-bold text-[#050B14]">You Will Receive</span>
                    <span className="text-[16px] font-extrabold text-green-600">{fmt(net)}</span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleRequestWithdraw}
                className="w-full py-4 bg-[#050B14] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.99] shadow-xl shadow-slate-900/10"
              >
                <span className="material-symbols-outlined text-[#e9c349]">send_money</span>
                Request Withdrawal
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Info (4 cols) ── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Withdrawal Limits */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#e9c349] text-[18px]">speed</span>
              </div>
              <h3 className="text-[14px] font-bold text-[#050B14]">Withdrawal Limits</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: "Daily Limit", used: balance.dailyUsed, total: balance.dailyLimit },
                { label: "Monthly Limit", used: balance.withdrawnThisMonth, total: balance.monthlyLimit },
              ].map(({ label, used, total }) => {
                const pct = Math.min((used / total) * 100, 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-[#64748B]">{label}</span>
                      <span className="font-semibold text-[#050B14]">{fmt(total - used)} remaining</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-[#e9c349] h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1">{fmt(used)} used of {fmt(total)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Processing Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#e9c349] text-[18px]">schedule</span>
              </div>
              <h3 className="text-[14px] font-bold text-[#050B14]">Processing Schedule</h3>
            </div>
            <div className="space-y-3 text-[13px]">
              {[
                { day: "Mon – Fri", time: "9:00 AM – 5:00 PM EAT", active: true },
                { day: "Saturday",  time: "10:00 AM – 2:00 PM EAT", active: true },
                { day: "Sunday",    time: "Closed", active: false },
              ].map(({ day, time, active }) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-[#64748B]">{day}</span>
                  <span className={`font-semibold ${active ? "text-[#050B14]" : "text-slate-300"}`}>{time}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#64748B] mt-4 leading-relaxed">
              Requests submitted outside business hours are queued and processed the next business day.
            </p>
          </div>

          {/* Important Notices */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-amber-500 text-[20px]">info</span>
              <h3 className="text-[14px] font-bold text-amber-900">Important Notices</h3>
            </div>
            <ul className="space-y-2.5">
              {[
                `Minimum withdrawal: ${fmt(MIN_WITHDRAW)}`,
                "Funds must complete the 30-day lock-up period before withdrawal.",
                "Bank details must match your KYC-registered information.",
                "Withdrawal requests cannot be cancelled after confirmation.",
                "Large withdrawals (>$10,000) may require additional verification.",
              ].map((notice) => (
                <li key={notice} className="flex items-start gap-2 text-[12px] text-amber-800">
                  <span className="material-symbols-outlined text-amber-500 text-[14px] mt-0.5 shrink-0">warning</span>
                  {notice}
                </li>
              ))}
            </ul>
          </div>

          {/* Need Help */}
          <div className="bg-[#050B14] rounded-2xl p-6">
            <h3 className="text-white font-bold text-[14px] mb-2">Need Assistance?</h3>
            <p className="text-slate-400 text-[12px] mb-4 leading-relaxed">
              Your account manager can expedite withdrawals and assist with large transfers.
            </p>
            <a
              href="/concierge"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#e9c349] text-[#050B14] rounded-xl font-bold text-[13px] hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
              Contact Account Manager
            </a>
          </div>
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="mt-8">
        <HistoryTable items={history} />
      </div>
    </div>
  );
}
