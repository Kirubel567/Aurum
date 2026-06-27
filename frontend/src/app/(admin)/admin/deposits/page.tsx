"use client";

// Direct conversion of the Deposit Verification Stitch HTML.
// Sidebar + Navbar are in (admin)/layout.tsx — only <main> canvas here.
// Spacing token map: p-lg→p-6, mb-xl→mb-10, gap-lg→gap-6, px-lg→px-6,
//   py-md→py-4, gap-md→gap-4, gap-sm→gap-2, py-sm→py-2, px-md→px-4,
//   gap-xs→gap-1, mt-xs→mt-1, mb-lg→mb-6, mx-lg→mx-6.
// Color token map: primary=#b08d1a, primary-container=#d4af37,
//   secondary=#059669, error=#dc2626, on-surface=#0f172a,
//   on-surface-variant=#64748b (slate-500).

import { useState } from "react";

export default function DepositVerificationPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="p-6 max-w-[1440px] h-full overflow-y-auto">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-[#0f172a]">Deposit Verification</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b08d1a] animate-pulse" />
            <p className="text-slate-500 font-data-mono uppercase tracking-widest text-xs">
              24 Pending Requests Requiring Review
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded text-body-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filter
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded text-body-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Log
          </button>
        </div>
      </header>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        {/* Total Deposits */}
        <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500">TOTAL DEPOSITS (MONTH)</span>
            <span className="material-symbols-outlined text-[#b08d1a]">account_balance_wallet</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-headline-lg text-[#0f172a]">$1.2M</span>
            <span className="text-[#059669] text-label-caps font-data-mono font-bold">+12.4%</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-[#b08d1a] h-full w-3/4" />
          </div>
        </div>

        {/* Pending Proofs */}
        <div className="glass-card-gold p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-9xl text-[#b08d1a]">pending_actions</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-[#b08d1a] font-bold">PENDING PROOFS</span>
            <span className="material-symbols-outlined text-[#b08d1a]">hourglass_empty</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-headline-lg text-[#b08d1a]">24</span>
            <span className="text-slate-500 text-label-caps font-data-mono">URGENT</span>
          </div>
          <p className="text-body-sm text-slate-500 italic">Next scheduled batch in 14m</p>
        </div>

        {/* Approved Today */}
        <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-slate-500">APPROVED TODAY</span>
            <span className="material-symbols-outlined text-[#059669]">verified</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-headline-lg text-[#0f172a]">156</span>
            <span className="text-slate-500 text-label-caps font-data-mono">BY 4 AGENTS</span>
          </div>
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 border border-white" />
            <div className="w-6 h-6 rounded-full bg-slate-300 border border-white" />
            <div className="w-6 h-6 rounded-full bg-slate-400 border border-white" />
            <div className="w-6 h-6 flex items-center justify-center text-[10px] bg-slate-100 rounded-full border border-slate-200 text-slate-500 font-bold">
              +1
            </div>
          </div>
        </div>
      </div>

      {/* ── Main data table ──────────────────────────────────────────────── */}
      <section className="glass-card rounded-xl overflow-hidden">

        {/* Table header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-label-caps text-label-caps text-slate-500 uppercase tracking-[0.1em]">
            User Deposit Proofs
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100/50 border border-slate-200 rounded p-0.5 shadow-inner">
              <button className="px-3 py-1 bg-[#b08d1a] text-white text-xs font-bold rounded shadow-sm">
                Active
              </button>
              <button className="px-3 py-1 text-slate-500 text-xs hover:text-[#0f172a] font-medium">
                Resolved
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-label-caps font-label-caps text-slate-500 border-b border-slate-100 bg-slate-50/30">
                <th className="px-6 py-4 font-bold">USER</th>
                <th className="px-6 py-4 font-bold">ASSET</th>
                <th className="px-6 py-4 font-bold text-right">AMOUNT</th>
                <th className="px-6 py-4 font-bold">DATE / TIME</th>
                <th className="px-6 py-4 font-bold">PROOF</th>
                <th className="px-6 py-4 font-bold">STATUS</th>
                <th className="px-6 py-4 font-bold text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">

              {/* Row 1 — Alex Rivera — Pending */}
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-9 h-9 rounded bg-slate-200 object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLYz7AEZ6MIzG8ebur2n840ljMD_BoZIbrjKf9I7TNKMwAeJmCheWfXxxqS-4TZfNmZILsExOZKWSvAWJghkeCBVhRAh0KlwSLybC5amA-WZxYwxHoIwxmtu2DJ2EwMPw-lz9WLjhyHV_yzwQnlb0MVMIy4Ys_vtsh_cWiTWQARe8ONoe-wjXGg6TeCIHJl3h7-1mutAjDB38x3ZE3O1wbrs4W4F9DBDxb8ERS58YGu45-hvZEQ6EE8cRVarmmcLmlaYB2-wFcgis"
                      alt="Alex Rivera"
                    />
                    <div>
                      <p className="font-bold text-[#0f172a]">Alex Rivera</p>
                      <p className="text-[10px] text-slate-500 font-data-mono">ID: AUR-9923</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#F7931A]/10 text-[#F7931A] rounded-full flex items-center justify-center text-[10px] font-bold">₿</span>
                    <span className="font-data-mono text-body-sm text-[#0f172a]">BTC</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-data-mono font-bold text-[#b08d1a]">0.45000000</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-body-sm text-[#0f172a]">Oct 24, 2023</p>
                  <p className="text-[11px] text-slate-500 font-data-mono">14:22:15 UTC</p>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 text-[#b08d1a] hover:text-[#d4af37] group-hover:translate-x-1 transition-transform"
                  >
                    <span className="material-symbols-outlined text-md">visibility</span>
                    <span className="text-xs uppercase font-bold tracking-widest">Preview</span>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#b08d1a]/20 text-[#b08d1a] bg-[#b08d1a]/5">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-4">
                    <button className="material-symbols-outlined text-[#059669] hover:bg-[#059669]/10 p-1.5 rounded transition-all" title="Approve">
                      check_circle
                    </button>
                    <button className="material-symbols-outlined text-[#dc2626] hover:bg-[#dc2626]/10 p-1.5 rounded transition-all" title="Reject">
                      cancel
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 2 — Elena Soros — Pending */}
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-9 h-9 rounded bg-slate-200 object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWH3N_FYSD7mQrDc3tUXgHUrSYCyjxNzm4Bn4RfuKvIckQtLzbYpjrS-rjW68hapOFyUUvblXTUHEiwhFeZo4kww69Le013B-L1nZ6rmFiahPYI2hCmS-QPquH3mLZiHSOm0x_iIDmJepCtmeFT1Ip_EOXscJtjdoVd2KNU20QzGDk8LcoEcxuAa-KcL6YKbanBxGTkaGOj_cwIeAB2M8wBb9qqbqytUtzTdxm5dWVzuMmGvW1Yy8XS0NhfGTvfKhEzj39ye5nbf4"
                      alt="Elena Soros"
                    />
                    <div>
                      <p className="font-bold text-[#0f172a]">Elena Soros</p>
                      <p className="text-[10px] text-slate-500 font-data-mono">ID: AUR-4481</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#26A17B]/10 text-[#26A17B] rounded-full flex items-center justify-center text-[10px] font-bold">₮</span>
                    <span className="font-data-mono text-body-sm text-[#0f172a]">USDT</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-data-mono font-bold text-[#b08d1a]">12,500.00</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-body-sm text-[#0f172a]">Oct 24, 2023</p>
                  <p className="text-[11px] text-slate-500 font-data-mono">14:18:44 UTC</p>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 text-[#b08d1a] hover:text-[#d4af37] group-hover:translate-x-1 transition-transform"
                  >
                    <span className="material-symbols-outlined text-md">visibility</span>
                    <span className="text-xs uppercase font-bold tracking-widest">Preview</span>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#b08d1a]/20 text-[#b08d1a] bg-[#b08d1a]/5">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-4">
                    <button className="material-symbols-outlined text-[#059669] hover:bg-[#059669]/10 p-1.5 rounded transition-all" title="Approve">
                      check_circle
                    </button>
                    <button className="material-symbols-outlined text-[#dc2626] hover:bg-[#dc2626]/10 p-1.5 rounded transition-all" title="Reject">
                      cancel
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 3 — Marcus Webb — Pending (initials avatar) */}
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded bg-[#b08d1a]/10 flex items-center justify-center text-[#b08d1a] font-bold">
                      MW
                    </div>
                    <div>
                      <p className="font-bold text-[#0f172a]">Marcus Webb</p>
                      <p className="text-[10px] text-slate-500 font-data-mono">ID: AUR-1209</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#627EEA]/10 text-[#627EEA] rounded-full flex items-center justify-center text-[10px] font-bold">Ξ</span>
                    <span className="font-data-mono text-body-sm text-[#0f172a]">ETH</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-data-mono font-bold text-[#b08d1a]">4.20911022</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-body-sm text-[#0f172a]">Oct 24, 2023</p>
                  <p className="text-[11px] text-slate-500 font-data-mono">13:55:01 UTC</p>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 text-[#b08d1a] hover:text-[#d4af37] group-hover:translate-x-1 transition-transform"
                  >
                    <span className="material-symbols-outlined text-md">visibility</span>
                    <span className="text-xs uppercase font-bold tracking-widest">Preview</span>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#b08d1a]/20 text-[#b08d1a] bg-[#b08d1a]/5">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-4">
                    <button className="material-symbols-outlined text-[#059669] hover:bg-[#059669]/10 p-1.5 rounded transition-all" title="Approve">
                      check_circle
                    </button>
                    <button className="material-symbols-outlined text-[#dc2626] hover:bg-[#dc2626]/10 p-1.5 rounded transition-all" title="Reject">
                      cancel
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 4 — Sarah Chen — Approved */}
              <tr className="hover:bg-slate-50/50 transition-colors opacity-70">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-9 h-9 rounded bg-slate-200 object-cover grayscale"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJwpF6QuPkGoYlZxontmHUW0S9bbiS_TLaneGbqSqP4-XZ902hIsmxmXNLsVvHIID3MgWGNmKaw_epoDP2nm2nxoKn2RqvXqTPqAUU5_mZ0gInLIH2ela5wytEUHKya0vlvQ4CsCEZLjz3M0Ses3toQy1e6tVGxbIRoOnLu_wQ-drxgMQZcEe0oF7CdNMeNeszIViuX42SuImAkocC81LKKe8CIP0JkN-03nfJylBoeVmGMIhBF1-frm9gVXIzrroDsbGHflnLhFM"
                      alt="Sarah Chen"
                    />
                    <div>
                      <p className="font-bold text-[#0f172a]">Sarah Chen</p>
                      <p className="text-[10px] text-slate-500 font-data-mono">ID: AUR-3321</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#26A17B]/10 text-[#26A17B] rounded-full flex items-center justify-center text-[10px] font-bold">₮</span>
                    <span className="font-data-mono text-body-sm text-[#0f172a]">USDT</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-data-mono font-bold text-[#b08d1a]">50,000.00</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-body-sm text-[#0f172a]">Oct 24, 2023</p>
                  <p className="text-[11px] text-slate-500 font-data-mono">13:30:12 UTC</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-md">done_all</span>
                    <span className="text-xs uppercase font-bold tracking-widest">Archived</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono uppercase border border-[#059669]/20 text-[#059669] bg-[#059669]/5">
                    Approved
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-label-caps font-bold">PROCESSED</span>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-body-sm text-slate-500">
            Showing <span className="text-[#0f172a] font-bold">1-10</span> of 24 entries
          </p>
          <div className="flex items-center gap-1">
            <button className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 shadow-sm" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="px-3 py-1 bg-[#b08d1a] text-white text-xs font-bold rounded shadow-sm">1</button>
            <button className="px-3 py-1 border border-slate-200 bg-white text-slate-500 text-xs hover:bg-slate-50 rounded shadow-sm">2</button>
            <button className="px-3 py-1 border border-slate-200 bg-white text-slate-500 text-xs hover:bg-slate-50 rounded shadow-sm">3</button>
            <button className="p-1 border border-slate-200 bg-white rounded hover:bg-slate-50 shadow-sm">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Preview modal ────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white max-w-2xl w-full mx-6 p-6 rounded-xl shadow-2xl border border-[#b08d1a]/20">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-headline-md text-headline-md text-[#b08d1a]">
                Transaction Proof Preview
              </h4>
              <button
                className="material-symbols-outlined text-slate-500 hover:text-slate-900"
                onClick={() => setModalOpen(false)}
              >
                close
              </button>
            </div>
            <div className="aspect-video w-full bg-slate-100 rounded border border-slate-200 mb-6 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-full object-contain"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQB3U3tsIf9fNR-aE5phK95zKAJeD8u9R37YqqDqUUGMEJqnkjPdu9y5_0vrGvGIiWUGanRtMEJ92Q4rQV7wVCG0w1vKuCDfJcPBzoZbTpFENDNCwKZeL7UycQUNNnZ6M6b0-bHYsdV7QljeI0SVnEsnM1nv-XaxyvrzvXkrb0rKhbXJxoXyJEzUrWdKdq1hBLON9idKb0Repss8we4X4UmW3z5_J0lhIJ5p57X_WM7WiVvAsKo-Rwv3huK9fsa8JTO6f2ZYOuk7s"
                alt="Transaction proof"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                className="px-6 py-2 bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 rounded font-bold hover:bg-[#dc2626]/20 transition-all"
                onClick={() => setModalOpen(false)}
              >
                Reject Proof
              </button>
              <button
                className="px-6 py-2 bg-[#059669] text-white rounded font-bold hover:brightness-110 transition-all shadow-md"
                onClick={() => setModalOpen(false)}
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
