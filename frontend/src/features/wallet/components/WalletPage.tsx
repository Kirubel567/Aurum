"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

// ── Modal ─────────────────────────────────────────────────────────────────────

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
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Balance card ──────────────────────────────────────────────────────────────

function BalanceCard() {
  const router = useRouter();
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
            <button onClick={() => setHidden((h) => !h)} className="text-gray-500 hover:text-gray-300 transition-colors">
              {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{hidden ? "••••••" : "$100.00"}</span>
          <span className="text-xs font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded">USD</span>
        </div>
        <div className="mt-4">
          <p className="text-[10px] text-gray-400">Available Balance</p>
          <p className="text-sm font-bold text-green-400 mt-0.5">{hidden ? "••••" : "$100.00"}</p>
        </div>
      </div>

      {/* Decorative icon */}
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
  onViewDetails,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  onViewDetails: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col justify-between">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", iconBg, iconColor)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      </div>
      <button
        onClick={onViewDetails}
        className="text-xs font-bold text-blue-600 mt-4 flex items-center gap-1 hover:underline w-fit"
      >
        View Details <ChevronRight className="size-3" />
      </button>
    </div>
  );
}

// ── Transaction table ─────────────────────────────────────────────────────────

const TX_ROWS = [
  {
    date: "May 15, 2025 • 10:30 AM",
    icon: <ArrowDownLeft className="size-3" />,
    iconBg: "bg-green-50",
    iconColor: "text-green-500",
    type: "Wallet Funding",
    typeColor: "text-gray-700",
    desc: "Wallet activation from deposit",
    amount: "+$100.00",
    amountColor: "text-green-600",
    status: "Completed",
    statusClass: "bg-green-50 text-green-600",
    placeholder: false,
  },
  {
    date: "May 15, 2025 • 10:28 AM",
    icon: <ArrowDownLeft className="size-3" />,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    type: "Deposit",
    typeColor: "text-gray-700",
    desc: "Deposit via Commercial Bank",
    amount: "+$1,200.00",
    amountColor: "text-green-600",
    status: "Completed",
    statusClass: "bg-green-50 text-green-600",
    placeholder: false,
  },
  {
    date: "-",
    icon: <Clock className="size-3" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    type: "Pending Withdrawal",
    typeColor: "text-gray-400",
    desc: "-",
    amount: "$0.00",
    amountColor: "text-gray-300",
    status: "-",
    statusClass: "",
    placeholder: true,
  },
  {
    date: "-",
    icon: <ArrowUpRight className="size-3" />,
    iconBg: "bg-red-50",
    iconColor: "text-red-400",
    type: "Withdrawal",
    typeColor: "text-gray-400",
    desc: "-",
    amount: "$0.00",
    amountColor: "text-gray-300",
    status: "-",
    statusClass: "",
    placeholder: true,
  },
  {
    date: "-",
    icon: <Zap className="size-3" />,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-400",
    type: "Adjustment",
    typeColor: "text-gray-400",
    desc: "-",
    amount: "$0.00",
    amountColor: "text-gray-300",
    status: "-",
    statusClass: "",
    placeholder: true,
  },
];

const TABS = ["Transaction History", "Withdrawal History", "Wallet Details"];

const WALLET_DETAILS = [
  { label: "Wallet ID", value: "WLT-78345" },
  { label: "Status", value: "Active" },
  { label: "Activated On", value: "May 15, 2025" },
  { label: "Currency", value: "USD — US Dollar" },
  { label: "Account Type", value: "Standard Investor" },
  { label: "Withdrawal Method", value: "Bank Transfer" },
  { label: "KYC Level", value: "Level 2 — Verified" },
  { label: "Daily Withdrawal Limit", value: "$10,000.00" },
  { label: "Monthly Withdrawal Limit", value: "$50,000.00" },
];

function TransactionTable() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={cn(
              "shrink-0 px-5 sm:px-8 py-4 text-sm transition-colors",
              activeTab === i
                ? "font-bold text-blue-600 border-b-2 border-blue-600"
                : "font-medium text-gray-400 hover:text-gray-600"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {TX_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                      row.placeholder ? "opacity-40" : ""
                    )}
                  >
                    <td className="px-6 py-5 text-gray-500 font-medium text-xs">{row.date}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", row.iconBg, row.iconColor)}>
                          {row.icon}
                        </div>
                        <span className={cn("font-semibold text-sm", row.typeColor)}>{row.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-gray-500 text-sm">{row.desc}</td>
                    <td className={cn("px-6 py-5 font-bold text-sm", row.amountColor)}>{row.amount}</td>
                    <td className="px-6 py-5">
                      {row.status !== "-" ? (
                        <span className={cn("px-2.5 py-1 rounded text-[10px] font-bold uppercase", row.statusClass)}>
                          {row.status}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-center">
            <p className="text-xs text-gray-400 font-medium">Showing 5 of 5 transactions</p>
          </div>
        </>
      )}

      {activeTab === 1 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <ArrowUpRight className="size-6 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-400">No withdrawal history</p>
          <p className="text-xs text-gray-400 mt-1">Approved withdrawal requests will appear here.</p>
        </div>
      )}

      {activeTab === 2 && (
        <div className="divide-y divide-gray-50">
          {WALLET_DETAILS.map((row) => (
            <div key={row.label} className="flex justify-between items-center px-6 py-4 text-sm">
              <span className="text-gray-400 font-medium">{row.label}</span>
              <span className="font-semibold text-gray-800">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar widgets ───────────────────────────────────────────────────────────

function WalletInfoPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Wallet className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Wallet Information</h3>
        </div>
        <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          Active
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Wallet Status</span>
          <span className="font-semibold text-gray-800">Active</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Activated On</span>
          <span className="font-semibold text-gray-800">May 15, 2025</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Wallet ID</span>
          <span className="font-semibold text-gray-800">WLT-78345</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Currency</span>
          <span className="font-semibold text-gray-800">USD — US Dollar</span>
        </div>
      </div>
    </div>
  );
}

function WithdrawalSchedulePanel({ onView }: { onView: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <CalendarCheck className="size-5 text-blue-600" />
        </div>
        <h3 className="font-bold text-gray-800">Withdrawal Schedule</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Withdrawals are processed on the 1st and 15th of each month. Requests submitted before the
        cut-off date will be included in the next cycle.
      </p>
      <button
        onClick={onView}
        className="w-full py-2 border border-blue-600 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
      >
        View Schedule
      </button>
    </div>
  );
}

function NeedHelpPanel() {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Headphones className="size-5 text-blue-600" />
        </div>
        <h3 className="font-bold text-gray-800">Need Help?</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Our support team is available 24/7 to assist with withdrawals, wallet queries, and account issues.
      </p>
      <button
        onClick={() => router.push(ROUTES.SUPPORT)}
        className="w-full py-2 border border-blue-600 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
      >
        Contact Support
      </button>
    </div>
  );
}

// ── Trust badges ──────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  { icon: Shield,      label: "Secure Wallet",    desc: "Your funds are protected with bank-level security." },
  { icon: Zap,         label: "Fast Withdrawal",  desc: "Approved withdrawals are processed quickly." },
  { icon: Smartphone,  label: "Easy Access",      desc: "Access your wallet anytime, anywhere." },
  { icon: FileText,    label: "Transparent",      desc: "100% transparency in all transactions." },
];

// ── Modal content blocks ──────────────────────────────────────────────────────

function HowWalletWorksContent() {
  const steps = [
    {
      num: "01",
      title: "Deposit & Allocation",
      body: "When you make a deposit, $100 is automatically allocated to activate and fund your personal wallet. The remaining balance is placed into your trading account.",
    },
    {
      num: "02",
      title: "Wallet Balance",
      body: "Your wallet balance is completely separate from your trading account. It is not exposed to any trades or market risk — it is your personal reserve.",
    },
    {
      num: "03",
      title: "Requesting a Withdrawal",
      body: "You can request a withdrawal from your wallet balance at any time via the 'Request Withdrawal' button. Requests are reviewed and processed on the next scheduled cycle (1st and 15th of the month).",
    },
    {
      num: "04",
      title: "Processing Time",
      body: "Once approved, withdrawals are processed within 1–3 business days depending on your bank. You will receive a confirmation email when the transfer is initiated.",
    },
    {
      num: "05",
      title: "Limits & Security",
      body: "Daily withdrawal limit: $10,000. Monthly limit: $50,000. All transactions are encrypted and monitored for unusual activity.",
    },
  ];

  return (
    <div className="space-y-5">
      {steps.map((s) => (
        <div key={s.num} className="flex gap-4">
          <span className="text-[11px] font-black text-blue-600 bg-blue-50 rounded-lg px-2 py-1 h-fit shrink-0">
            {s.num}
          </span>
          <div>
            <p className="text-sm font-bold text-gray-800 mb-0.5">{s.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LearnMoreContent() {
  return (
    <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
      <p>
        Aurum Sovereign Capital requires a <span className="font-bold text-gray-900">$100 wallet activation fee</span> from
        every investor&apos;s initial deposit. This is a one-time allocation.
      </p>
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
        <p className="font-bold text-blue-800 text-xs uppercase tracking-wider">Why is this required?</p>
        <ul className="space-y-1 text-xs text-blue-700">
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

function DepositDetailsContent() {
  const rows = [
    { label: "Total Deposited", value: "$1,200.00", highlight: false },
    { label: "Wallet Activation Fee", value: "$100.00", highlight: false },
    { label: "Active Trading Capital", value: "$1,100.00", highlight: true },
    { label: "Last Deposit Date", value: "May 15, 2025", highlight: false },
    { label: "Deposit Method", value: "Commercial Bank Transfer", highlight: false },
    { label: "Deposit Reference", value: "DEP-20250515-001", highlight: false },
    { label: "Deposit Status", value: "Completed ✓", highlight: false },
  ];
  return (
    <div className="divide-y divide-gray-100">
      {rows.map((r) => (
        <div key={r.label} className={cn("flex justify-between py-3 text-sm", r.highlight ? "font-bold" : "")}>
          <span className="text-gray-500">{r.label}</span>
          <span className={cn("font-semibold", r.highlight ? "text-blue-600" : "text-gray-800")}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function WithdrawalDetailsContent() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
        <p className="text-2xl font-black text-gray-800">$0.00</p>
        <p className="text-xs text-gray-400 mt-1">Total Withdrawn (All Time)</p>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        No withdrawals have been processed for this account yet. Once you submit a withdrawal request
        and it is approved, a full history with transaction IDs, amounts, and bank references will
        appear here.
      </p>
      <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
        <p className="text-xs font-bold text-gray-400">Next Processing Window</p>
        <p className="text-sm font-bold text-gray-800 mt-1">July 1, 2026</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Cut-off: June 28 at 11:59 PM UTC</p>
      </div>
    </div>
  );
}

function PendingDetailsContent() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
        <p className="text-2xl font-black text-amber-700">$0.00</p>
        <p className="text-xs text-amber-600 mt-1">Pending Withdrawal Requests</p>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        You have no pending withdrawal requests at this time. When you submit a withdrawal, it will
        appear here with a status of <span className="font-bold text-amber-600">Pending Review</span> until
        it is approved by the operations team.
      </p>
      <div className="rounded-xl border border-dashed border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 mb-2">Typical Review Timeline</p>
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex justify-between"><span>Submission</span><span className="font-semibold">Instant</span></div>
          <div className="flex justify-between"><span>Operations Review</span><span className="font-semibold">1–2 business days</span></div>
          <div className="flex justify-between"><span>Bank Transfer</span><span className="font-semibold">1–3 business days</span></div>
        </div>
      </div>
    </div>
  );
}

function ScheduleContent() {
  const schedule = [
    { cycle: "Cycle 1",  cutoff: "June 28, 2026", processing: "July 1, 2026",  status: "upcoming" },
    { cycle: "Cycle 2",  cutoff: "July 13, 2026",  processing: "July 15, 2026", status: "future" },
    { cycle: "Cycle 3",  cutoff: "July 29, 2026",  processing: "Aug 1, 2026",   status: "future" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Withdrawals are processed twice a month. Submit your request before the cut-off date to be
        included in that cycle.
      </p>
      <div className="space-y-3">
        {schedule.map((s) => (
          <div
            key={s.cycle}
            className={cn(
              "rounded-xl border p-4",
              s.status === "upcoming" ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"
            )}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-gray-800">{s.cycle}</p>
              {s.status === "upcoming" && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  Next
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Cut-off</span><span className="font-semibold text-gray-700">{s.cutoff}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing</span><span className="font-semibold text-gray-700">{s.processing}</span>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal ? MODAL_TITLES[modal] : ""}
      >
        {modal === "howWalletWorks"    && <HowWalletWorksContent />}
        {modal === "learnMore"         && <LearnMoreContent />}
        {modal === "depositDetails"    && <DepositDetailsContent />}
        {modal === "withdrawalDetails" && <WithdrawalDetailsContent />}
        {modal === "pendingDetails"    && <PendingDetailsContent />}
        {modal === "schedule"          && <ScheduleContent />}
      </Modal>

      {/* ── Title row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">My Wallet</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your wallet balance, view transactions, and request withdrawals.
          </p>
        </div>
        <button
          onClick={() => setModal("howWalletWorks")}
          className="flex w-fit items-center gap-2 px-4 py-2 border border-blue-100 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
        >
          <CircleHelp className="size-4" />
          How Wallet Works
        </button>
      </div>

      {/* ── Stat cards grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <BalanceCard />
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            icon={<ArrowDownLeft className="size-5" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            label="Total Deposited"
            value="$1,200.00"
            sub="Deposit amount"
            onViewDetails={() => setModal("depositDetails")}
          />
          <StatCard
            icon={<ArrowUpRight className="size-5" />}
            iconBg="bg-green-50"
            iconColor="text-green-500"
            label="Total Withdrawn"
            value="$0.00"
            sub="All time"
            onViewDetails={() => setModal("withdrawalDetails")}
          />
          <StatCard
            icon={<Clock className="size-5" />}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            label="Pending Requests"
            value="$0.00"
            sub="No pending requests"
            onViewDetails={() => setModal("pendingDetails")}
          />
        </div>
      </div>

      {/* ── Info banner ────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-blue-300 flex items-center justify-center flex-shrink-0">
            <Info className="size-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800">
              $100 from your deposit has been allocated to activate your wallet.
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              This wallet balance is not used for trading. It is for withdrawal and personal use.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal("learnMore")}
          className="text-sm font-bold text-blue-700 hover:underline flex items-center gap-1 whitespace-nowrap sm:ml-6 w-fit"
        >
          Learn More <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/* ── Lower content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <TransactionTable />
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <WalletInfoPanel />
          <WithdrawalSchedulePanel onView={() => setModal("schedule")} />
          <NeedHelpPanel />
        </div>
      </div>

      {/* ── Trust badges ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-4 pb-12">
        {TRUST_BADGES.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-4 bg-white/50 p-4 rounded-xl border border-gray-100"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
              <Icon className="size-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-gray-800">{label}</h5>
              <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
