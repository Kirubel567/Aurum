"use client";

import { useState } from "react";

// ── Balance card ──────────────────────────────────────────────────────────────

function BalanceCard() {
  return (
    <div
      className="col-span-12 lg:col-span-4 rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-between"
      style={{ background: "#0a0e14", height: "14rem" }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400 font-medium flex items-center gap-2">
            Total Wallet Balance{" "}
            <i className="fa-regular fa-eye-slash text-xs cursor-pointer" />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">$100.00</span>
          <span className="text-xs font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            USD
          </span>
        </div>
        <div className="mt-4">
          <p className="text-[10px] text-gray-400">Available Balance</p>
          <p className="text-sm font-bold text-green-400 mt-0.5">$100.00</p>
        </div>
      </div>
      {/* Decorative icon */}
      <div className="absolute right-[-20px] top-4 opacity-10 pointer-events-none">
        <i className="fa-solid fa-wallet text-[140px]" />
      </div>
      <button
        className="w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all relative z-10 hover:opacity-90"
        style={{ background: "#d4a755", color: "#05070a" }}
      >
        <i className="fa-solid fa-arrow-up text-xs" />
        Request Withdrawal
      </button>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  iconClass,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  iconClass: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col justify-between">
      <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center mb-4`}>
        <i className={`${iconClass} ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      </div>
      <a
        href="#"
        className="text-xs font-bold text-blue-600 mt-4 flex items-center gap-1 hover:underline"
      >
        View Details <i className="fa-solid fa-chevron-right text-[10px]" />
      </a>
    </div>
  );
}

// ── Transaction table ─────────────────────────────────────────────────────────

const TX_ROWS = [
  {
    date: "May 15, 2025 • 10:30 AM",
    iconClass: "fa-solid fa-arrow-down",
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
    iconClass: "fa-solid fa-arrow-down",
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
    iconClass: "fa-regular fa-clock",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    type: "Pending Withdrawal",
    typeColor: "text-gray-400",
    desc: "-",
    amount: "$0.00",
    amountColor: "text-gray-700",
    status: "-",
    statusClass: "",
    placeholder: true,
  },
  {
    date: "-",
    iconClass: "fa-solid fa-arrow-up",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    type: "Withdrawal",
    typeColor: "text-gray-400",
    desc: "-",
    amount: "$0.00",
    amountColor: "text-gray-700",
    status: "-",
    statusClass: "",
    placeholder: true,
  },
  {
    date: "-",
    iconClass: "fa-solid fa-bolt",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-500",
    type: "Adjustment",
    typeColor: "text-gray-400",
    desc: "-",
    amount: "$0.00",
    amountColor: "text-gray-700",
    status: "-",
    statusClass: "",
    placeholder: true,
  },
];

const TABS = ["Transaction History", "Withdrawal History", "Wallet Details"];

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
            className={`shrink-0 px-5 sm:px-8 py-4 text-sm transition-colors ${
              activeTab === i
                ? "font-bold text-blue-600 border-b-2 border-blue-600"
                : "font-medium text-gray-400 hover:text-gray-600"
            }`}
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
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                    row.placeholder ? "text-gray-300" : ""
                  }`}
                >
                  <td className="px-6 py-5 text-gray-500 font-medium">{row.date}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${row.iconBg} flex items-center justify-center`}
                      >
                        <i className={`${row.iconClass} ${row.iconColor} text-[10px]`} />
                      </div>
                      <span className={`font-semibold ${row.typeColor}`}>{row.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-gray-500">{row.desc}</td>
                  <td className={`px-6 py-5 font-bold ${row.amountColor}`}>{row.amount}</td>
                  <td className="px-6 py-5">
                    {row.status !== "-" ? (
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${row.statusClass}`}
                      >
                        {row.status}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <i className="fa-solid fa-arrow-up-from-bracket text-4xl text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-400">No withdrawal history</p>
          <p className="text-xs text-gray-400 mt-1">Approved requests will appear here.</p>
        </div>
      )}

      {activeTab === 2 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <i className="fa-solid fa-wallet text-4xl text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-400">Wallet details</p>
          <p className="text-xs text-gray-400 mt-1">Configuration details will appear here.</p>
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
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <i className="fa-solid fa-wallet text-white text-lg" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Wallet Information</h3>
        </div>
        <span className="bg-green-50 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
          Active
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Wallet Status</span>
          <span className="font-semibold text-gray-800">May 15, 2025</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Activated On</span>
          <span className="font-semibold text-gray-800">WLT-78345</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Currency</span>
          <span className="font-semibold text-gray-800">USD - US Dollar</span>
        </div>
      </div>
    </div>
  );
}

function WithdrawalSchedulePanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <i className="fa-regular fa-calendar-check text-blue-600 text-lg" />
        </div>
        <h3 className="font-bold text-gray-800">Withdrawal Schedule</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        You can request a withdrawal based on the company&apos;s withdrawal schedule.
      </p>
      <button className="w-full py-2 border border-blue-600 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors">
        View Schedule
      </button>
    </div>
  );
}

function NeedHelpPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <i className="fa-solid fa-headset text-blue-600 text-lg" />
        </div>
        <h3 className="font-bold text-gray-800">Need Help?</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Our support team is available 24/7 to assist you.
      </p>
      <button className="w-full py-2 border border-blue-600 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors">
        Contact Support
      </button>
    </div>
  );
}

// ── Trust badges ──────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  {
    icon: "fa-solid fa-shield-halved",
    label: "Secure Wallet",
    desc: "Your funds are protected with bank-level security.",
  },
  {
    icon: "fa-solid fa-bolt-lightning",
    label: "Fast Withdrawal",
    desc: "Approved withdrawals are processed quickly.",
  },
  {
    icon: "fa-solid fa-mobile-screen",
    label: "Easy Access",
    desc: "Access your wallet anytime, anywhere.",
  },
  {
    icon: "fa-solid fa-file-lines",
    label: "Transparent",
    desc: "100% transparency in all transactions.",
  },
];

// ── Page root ─────────────────────────────────────────────────────────────────

export function WalletPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">My Wallet</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your wallet balance, view transactions, and request withdrawals.
          </p>
        </div>
        <button className="flex w-fit items-center gap-2 px-4 py-2 border border-blue-100 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
          <i className="fa-regular fa-circle-question" />
          How Wallet Works
        </button>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <BalanceCard />
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            iconClass="fa-solid fa-arrow-down-long"
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            label="Total Deposited"
            value="$1,200.00"
            sub="Deposit amount"
          />
          <StatCard
            iconClass="fa-solid fa-arrow-up-long"
            iconBg="bg-green-50"
            iconColor="text-green-500"
            label="Total Withdrawn"
            value="$0.00"
            sub="All time"
          />
          <StatCard
            iconClass="fa-regular fa-clock"
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            label="Pending Requests"
            value="$0.00"
            sub="No pending requests"
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-info text-blue-600 text-xs" />
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
        <a
          href="#"
          className="text-sm font-bold text-blue-700 hover:underline flex items-center gap-1 whitespace-nowrap sm:ml-6"
        >
          Learn More <i className="fa-solid fa-chevron-right text-[10px]" />
        </a>
      </div>

      {/* Lower content grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <TransactionTable />
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <WalletInfoPanel />
          <WithdrawalSchedulePanel />
          <NeedHelpPanel />
        </div>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-4 pb-12">
        {TRUST_BADGES.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-4 bg-white/50 p-4 rounded-xl border border-gray-100"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
              <i className={b.icon} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-gray-800">{b.label}</h5>
              <p className="text-[10px] text-gray-500 leading-tight">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
