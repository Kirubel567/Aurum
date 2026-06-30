"use client";

// Stitch dark tokens (deposit page):
// glass-card:      rgba(255,255,255,0.03) + blur(12px) + border rgba(255,255,255,0.1)
// glass-card-gold: rgba(255,255,255,0.03) + blur(12px) + border rgba(212,175,55,0.2)
// bg body:         #050B14
// primary:         #f2ca50   on-primary: #3c2f00
// secondary:       #4edea3   on-secondary: #003824
// error:           #ffb4ab
// on-surface:      #dce3f0
// on-surface-variant: #d0c5af
// surface:         #0d141d
// surface-container: #19202a
// surface-container-lowest: #080f18

import { useState } from "react";

type DepositStatus = "Pending" | "Approved" | "Rejected";

type Deposit = {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  asset: "BTC" | "USDT" | "ETH";
  assetIcon: string;
  assetColor: string;
  assetBg: string;
  amount: string;
  date: string;
  time: string;
  status: DepositStatus;
};

const INITIAL_DEPOSITS: Deposit[] = [
  {
    id: "AUR-9923", name: "Alex Rivera",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDLYz7AEZ6MIzG8ebur2n840ljMD_BoZIbrjKf9I7TNKMwAeJmCheWfXxxqS-4TZfNmZILsExOZKWSvAWJghkeCBVhRAh0KlwSLybC5amA-WZxYwxHoIwxmtu2DJ2EwMPw-lz9WLjhyHV_yzwQnlb0MVMIy4Ys_vtsh_cWiTWQARe8ONoe-wjXGg6TeCIHJl3h7-1mutAjDB38x3ZE3O1wbrs4W4F9DBDxb8ERS58YGu45-hvZEQ6EE8cRVarmmcLmlaYB2-wFcgis",
    asset: "BTC", assetIcon: "₿", assetColor: "#F7931A", assetBg: "#F7931A",
    amount: "0.45000000", date: "Oct 24, 2023", time: "14:22:15 UTC", status: "Pending",
  },
  {
    id: "AUR-4481", name: "Elena Soros",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWH3N_FYSD7mQrDc3tUXgHUrSYCyjxNzm4Bn4RfuKvIckQtLzbYpjrS-rjW68hapOFyUUvblXTUHEiwhFeZo4kww69Le013B-L1nZ6rmFiahPYI2hCmS-QPquH3mLZiHSOm0x_iIDmJepCtmeFT1Ip_EOXscJtjdoVd2KNU20QzGDk8LcoEcxuAa-KcL6YKbanBxGTkaGOj_cwIeAB2M8wBb9qqbqytUtzTdxm5dWVzuMmGvW1Yy8XS0NhfGTvfKhEzj39ye5nbf4",
    asset: "USDT", assetIcon: "₮", assetColor: "#26A17B", assetBg: "#26A17B",
    amount: "12,500.00", date: "Oct 24, 2023", time: "14:18:44 UTC", status: "Pending",
  },
  {
    id: "AUR-1209", name: "Marcus Webb", initials: "MW",
    asset: "ETH", assetIcon: "Ξ", assetColor: "#627EEA", assetBg: "#627EEA",
    amount: "4.20911022", date: "Oct 24, 2023", time: "13:55:01 UTC", status: "Pending",
  },
  {
    id: "AUR-3321", name: "Sarah Chen",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJwpF6QuPkGoYlZxontmHUW0S9bbiS_TLaneGbqSqP4-XZ902hIsmxmXNLsVvHIID3MgWGNmKaw_epoDP2nm2nxoKn2RqvXqTPqAUU5_mZ0gInLIH2ela5wytEUHKya0vlvQ4CsCEZLjz3M0Ses3toQy1e6tVGxbIRoOnLu_wQ-drxgMQZcEe0oF7CdNMeNeszIViuX42SuImAkocC81LKKe8CIP0JkN-03nfJylBoeVmGMIhBF1-frm9gVXIzrroDsbGHflnLhFM",
    asset: "USDT", assetIcon: "₮", assetColor: "#26A17B", assetBg: "#26A17B",
    amount: "50,000.00", date: "Oct 24, 2023", time: "13:30:12 UTC", status: "Approved",
  },
];

export default function DepositVerificationPage() {
  const [deposits, setDeposits]     = useState<Deposit[]>(INITIAL_DEPOSITS);
  const [modalId, setModalId]       = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<"Active" | "Resolved">("Active");
  const [page, setPage]             = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAsset, setFilterAsset] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const pending  = deposits.filter((d) => d.status === "Pending").length;
  const approved = deposits.filter((d) => d.status === "Approved").length;

  const displayed = deposits.filter((d) => {
    const tabMatch = activeTab === "Active" ? d.status === "Pending" : d.status !== "Pending";
    const assetMatch = filterAsset === "All" || d.asset === filterAsset;
    const statusMatch = filterStatus === "All" || d.status === filterStatus;
    return tabMatch && assetMatch && statusMatch;
  });

  const previewDeposit = deposits.find((d) => d.id === modalId);

  function approve(id: string) {
    setDeposits((prev) => prev.map((d) => d.id === id ? { ...d, status: "Approved" } : d));
    setModalId(null);
  }
  function reject(id: string) {
    setDeposits((prev) => prev.map((d) => d.id === id ? { ...d, status: "Rejected" } : d));
    setModalId(null);
  }

  function exportCSV() {
    const rows = ["ID,Name,Asset,Amount,Date,Status",
      ...deposits.map((d) => `${d.id},${d.name},${d.asset},${d.amount},${d.date},${d.status}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "deposit_log.csv"; a.click();
  }

  // ── Dark mode class helpers ──────────────────────────────────────────────
  // glass-card dark: rgba(255,255,255,0.03) + blur + rgba(255,255,255,0.1) border
  const gc   = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(255,255,255,0.1)]";
  // glass-card-gold dark: same bg + rgba(212,175,55,0.2) border
  const gcg  = "dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md dark:border-[rgba(212,175,55,0.2)]";

  return (
    <main className="px-4 sm:p-6 max-w-[1440px] h-full overflow-y-auto pt-6 dark:bg-[#050b14]">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">
            Deposit Verification
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b08d1a] dark:bg-[#f2ca50] animate-pulse" />
            <p className="text-slate-500 dark:text-[#d0c5af] font-data-mono uppercase tracking-widest text-xs">
              {pending} Pending Requests Requiring Review
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`flex items-center gap-2 border px-4 py-2 rounded text-body-sm transition-all shadow-sm dark:shadow-none ${
                filterOpen || filterAsset !== "All" || filterStatus !== "All"
                  ? "bg-[#b08d1a]/10 dark:bg-[#f2ca50]/10 border-[#b08d1a]/40 dark:border-[#f2ca50]/40 text-[#b08d1a] dark:text-[#f2ca50]"
                  : "bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dce3f0] hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filter {(filterAsset !== "All" || filterStatus !== "All") && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#b08d1a] dark:bg-[#f2ca50] inline-block" />}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[rgba(25,32,42,0.95)] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-none z-50 p-4 space-y-4 backdrop-blur-md">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-wider mb-2">Asset</p>
                  <div className="flex flex-wrap gap-1">
                    {["All", "BTC", "USDT", "ETH"].map((a) => (
                      <button key={a} onClick={() => setFilterAsset(a)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                          filterAsset === a
                            ? "bg-[#b08d1a]/10 dark:bg-[#f2ca50]/20 border-[#b08d1a]/30 dark:border-[#f2ca50]/40 text-[#b08d1a] dark:text-[#f2ca50]"
                            : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#d0c5af] hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}>{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-wider mb-2">Status</p>
                  <div className="flex flex-wrap gap-1">
                    {["All", "Pending", "Approved", "Rejected"].map((s) => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                          filterStatus === s
                            ? "bg-[#b08d1a]/10 dark:bg-[#f2ca50]/20 border-[#b08d1a]/30 dark:border-[#f2ca50]/40 text-[#b08d1a] dark:text-[#f2ca50]"
                            : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#d0c5af] hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setFilterAsset("All"); setFilterStatus("All"); setFilterOpen(false); }}
                  className="w-full text-[10px] font-bold text-slate-400 dark:text-[#99907c] hover:text-slate-600 dark:hover:text-[#d0c5af] text-center pt-1 border-t border-slate-100 dark:border-white/5 transition-colors">
                  Clear filters
                </button>
              </div>
            )}
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 px-4 py-2 rounded text-body-sm text-slate-700 dark:text-[#dce3f0] hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm dark:shadow-none"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export Log
          </button>
        </div>
      </header>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        {/* Total Deposits */}
        <div className={`glass-card ${gc} p-6 rounded-xl flex flex-col gap-2`}>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af]">
              TOTAL DEPOSITS (MONTH)
            </span>
            <span className="material-symbols-outlined text-[#b08d1a] dark:text-[#f2ca50]">
              account_balance_wallet
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">$1.2M</span>
            <span className="text-[#059669] dark:text-[#4edea3] text-label-caps font-data-mono font-bold">+12.4%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-white/5 h-1 rounded-full overflow-hidden">
            <div className="bg-[#b08d1a] dark:bg-[#f2ca50] h-full w-3/4" />
          </div>
        </div>

        {/* Pending Proofs — glass-card-gold */}
        <div className={`glass-card-gold ${gcg} p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden`}>
          <div className="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-9xl text-[#b08d1a] dark:text-[#f2ca50]">pending_actions</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-[#b08d1a] dark:text-[#f2ca50] font-bold">
              PENDING PROOFS
            </span>
            <span className="material-symbols-outlined text-[#b08d1a] dark:text-[#f2ca50]">hourglass_empty</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-headline-lg text-[#b08d1a] dark:text-[#f2ca50]">{pending}</span>
            <span className="text-slate-500 dark:text-[#d0c5af] text-label-caps font-data-mono">URGENT</span>
          </div>
          <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] italic">Next scheduled batch in 14m</p>
        </div>

        {/* Approved Today */}
        <div className={`glass-card ${gc} p-6 rounded-xl flex flex-col gap-2`}>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af]">APPROVED TODAY</span>
            <span className="material-symbols-outlined text-[#059669] dark:text-[#4edea3]">verified</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">{approved + 150}</span>
            <span className="text-slate-500 dark:text-[#d0c5af] text-label-caps font-data-mono">BY 4 AGENTS</span>
          </div>
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-[#0d141d] border border-white dark:border-white/20" />
            <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-[#0d141d] border border-white dark:border-white/20" />
            <div className="w-6 h-6 rounded-full bg-slate-400 dark:bg-[#0d141d] border border-white dark:border-white/20" />
            <div className="w-6 h-6 flex items-center justify-center text-[10px] bg-slate-100 dark:bg-white/10 rounded-full border border-slate-200 dark:border-white/20 text-slate-500 dark:text-[#d0c5af] font-bold">
              +1
            </div>
          </div>
        </div>
      </div>

      {/* ── Main data table ──────────────────────────────────────────────── */}
      <section className={`glass-card ${gc} rounded-xl overflow-hidden`}>

        {/* Table header bar */}
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase tracking-[0.1em]">
            User Deposit Proofs
          </h3>
          <div className="flex items-center gap-4">
            {/* Active / Resolved toggle */}
            <div className="flex bg-slate-100/50 dark:bg-[#080f18] border border-slate-200 dark:border-white/10 rounded p-0.5">
              {(["Active", "Resolved"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setPage(1); }}
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-label-caps font-label-caps text-slate-500 dark:text-[#d0c5af] border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-transparent">
                <th className="px-6 py-4 font-bold">USER</th>
                <th className="px-6 py-4 font-bold">ASSET</th>
                <th className="px-6 py-4 font-bold text-right">AMOUNT</th>
                <th className="px-6 py-4 font-bold">DATE / TIME</th>
                <th className="px-6 py-4 font-bold">PROOF</th>
                <th className="px-6 py-4 font-bold">STATUS</th>
                <th className="px-6 py-4 font-bold text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">

              {displayed.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-[#d0c5af]">
                    No {activeTab.toLowerCase()} deposits.
                  </td>
                </tr>
              )}

              {displayed.map((dep) => {
                const resolved = dep.status !== "Pending";
                return (
                  <tr key={dep.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-colors group ${resolved ? "opacity-60" : ""}`}
                  >
                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {dep.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className={`w-9 h-9 rounded bg-slate-200 dark:bg-[#2e353f] object-cover ${resolved ? "grayscale" : ""}`}
                            src={dep.avatar} alt={dep.name} />
                        ) : (
                          <div className="w-9 h-9 rounded bg-[#b08d1a]/10 dark:bg-[#f2ca50]/20 flex items-center justify-center text-[#b08d1a] dark:text-[#f2ca50] font-bold text-xs">
                            {dep.initials}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{dep.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-[#d0c5af] font-data-mono">ID: {dep.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Asset */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: `${dep.assetBg}20`, color: dep.assetColor }}>
                          {dep.assetIcon}
                        </span>
                        <span className="font-data-mono text-body-sm text-[#0f172a] dark:text-[#dce3f0]">{dep.asset}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right">
                      <span className="font-data-mono font-bold text-[#b08d1a] dark:text-[#f2ca50]">{dep.amount}</span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <p className="text-body-sm text-[#0f172a] dark:text-[#dce3f0]">{dep.date}</p>
                      <p className="text-[11px] text-slate-500 dark:text-[#d0c5af] font-data-mono">{dep.time}</p>
                    </td>

                    {/* Proof */}
                    <td className="px-6 py-4">
                      {resolved ? (
                        <div className="flex items-center gap-2 text-slate-400 dark:text-[#d0c5af]">
                          <span className="material-symbols-outlined text-md">done_all</span>
                          <span className="text-xs uppercase font-bold tracking-widest">Archived</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setModalId(dep.id)}
                          className="flex items-center gap-2 text-[#b08d1a] dark:text-[#f2ca50] hover:underline group-hover:translate-x-1 transition-transform"
                        >
                          <span className="material-symbols-outlined text-md">visibility</span>
                          <span className="text-xs uppercase font-bold tracking-widest">Preview</span>
                        </button>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      {dep.status === "Pending" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#b08d1a]/20 dark:border-[#f2ca50]/30 text-[#b08d1a] dark:text-[#f2ca50] bg-[#b08d1a]/5 dark:bg-[#f2ca50]/10">
                          Pending
                        </span>
                      )}
                      {dep.status === "Approved" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#059669]/20 dark:border-[#4edea3]/30 text-[#059669] dark:text-[#4edea3] bg-[#059669]/5 dark:bg-[#4edea3]/10">
                          Approved
                        </span>
                      )}
                      {dep.status === "Rejected" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-red-300/30 dark:border-[#ffb4ab]/30 text-red-600 dark:text-[#ffb4ab] bg-red-50 dark:bg-[#ffb4ab]/10">
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {dep.status === "Pending" ? (
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => approve(dep.id)}
                            className="material-symbols-outlined text-[#059669] dark:text-[#4edea3] hover:bg-[#059669]/10 dark:hover:bg-[#4edea3]/20 p-1.5 rounded transition-all"
                            title="Approve"
                          >
                            check_circle
                          </button>
                          <button
                            onClick={() => reject(dep.id)}
                            className="material-symbols-outlined text-[#dc2626] dark:text-[#ffb4ab] hover:bg-[#dc2626]/10 dark:hover:bg-[#ffb4ab]/20 p-1.5 rounded transition-all"
                            title="Reject"
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between">
          <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">
            Showing <span className="text-[#0f172a] dark:text-[#dce3f0] font-bold">{Math.min(10 * page, 24)}</span> of 24 entries
          </p>
          <div className="flex items-center gap-1">
            <button
              className="p-1 border border-slate-200 dark:border-white/10 rounded bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 shadow-sm dark:shadow-none"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <span className="material-symbols-outlined dark:text-[#dce3f0]">chevron_left</span>
            </button>
            {[1, 2, 3].map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`px-3 py-1 text-xs font-bold rounded shadow-sm ${
                  page === n
                    ? "bg-[#b08d1a] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00]"
                    : "border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent text-slate-500 dark:text-[#d0c5af] hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              className="p-1 border border-slate-200 dark:border-white/10 rounded bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 shadow-sm dark:shadow-none"
              disabled={page === 3}
              onClick={() => setPage((p) => Math.min(3, p + 1))}
            >
              <span className="material-symbols-outlined dark:text-[#dce3f0]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Preview modal ────────────────────────────────────────────────── */}
      {modalId && previewDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-[#0d141d]/80 backdrop-blur-sm"
            onClick={() => setModalId(null)}
          />
          {/* glass-card-gold in dark */}
          <div className="relative bg-white dark:bg-[rgba(255,255,255,0.03)] dark:backdrop-blur-md max-w-2xl w-full mx-6 p-6 rounded-xl shadow-2xl dark:shadow-none border border-[#b08d1a]/20 dark:border-[rgba(212,175,55,0.2)]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-headline-md text-headline-md text-[#b08d1a] dark:text-[#f2ca50]">
                  Transaction Proof Preview
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#d0c5af] font-data-mono mt-0.5">
                  {previewDeposit.name} · {previewDeposit.id} · {previewDeposit.asset} {previewDeposit.amount}
                </p>
              </div>
              <button
                className="material-symbols-outlined text-slate-500 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => setModalId(null)}
              >
                close
              </button>
            </div>

            <div className="aspect-video w-full bg-slate-100 dark:bg-black rounded border border-slate-200 dark:border-white/10 mb-6 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-full object-contain"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQB3U3tsIf9fNR-aE5phK95zKAJeD8u9R37YqqDqUUGMEJqnkjPdu9y5_0vrGvGIiWUGanRtMEJ92Q4rQV7wVCG0w1vKuCDfJcPBzoZbTpFENDNCwKZeL7UycQUNNnZ6M6b0-bHYsdV7QljeI0SVnEsnM1nv-XaxyvrzvXkrb0rKhbXJxoXyJEzUrWdKdq1hBLON9idKb0Repss8we4X4UmW3z5_J0lhIJ5p57X_WM7WiVvAsKo-Rwv3huK9fsa8JTO6f2ZYOuk7s"
                alt="Transaction proof"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => reject(previewDeposit.id)}
                className="px-6 py-2 bg-[#dc2626]/10 dark:bg-[#ffb4ab]/10 text-[#dc2626] dark:text-[#ffb4ab] border border-[#dc2626]/20 dark:border-[#ffb4ab]/30 rounded font-bold hover:bg-[#dc2626]/20 dark:hover:bg-[#ffb4ab]/20 transition-all"
              >
                Reject Proof
              </button>
              <button
                onClick={() => approve(previewDeposit.id)}
                className="px-6 py-2 bg-[#059669] dark:bg-[#4edea3] text-white dark:text-[#003824] rounded font-bold hover:brightness-110 transition-all shadow-md"
              >
                Approve &amp; Release
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
