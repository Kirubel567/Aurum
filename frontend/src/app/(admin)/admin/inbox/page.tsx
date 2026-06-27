"use client";

// Direct Stitch → Next.js conversion of Client Messages / Ticket Router.
// Sidebar + Navbar in (admin)/layout.tsx. This page fills the remaining
// height with a three-panel flex layout: thread list (25%) | chat (50%) | overview (25%).
// Custom CSS (.chat-bubble-manager, .chat-bubble-client) defined in globals.css.

export default function ClientMessagesPage() {
  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] text-slate-900 overflow-hidden">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-6 pb-0">
        <h2 className="font-headline-md text-headline-md font-bold text-slate-900">
          Client Communications &amp; Ticket Router
        </h2>
        <p className="font-body-md text-body-md text-slate-500 max-w-3xl">
          Live multi-tenant investor messaging queue. Securely route tickets, handle direct client
          inquiries, and manage active support chats.
        </p>
      </div>

      {/* ── Three-Panel Interface ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-4 p-6 overflow-hidden">

        {/* ── Panel 1: Thread List (25%) ─────────────────────────────────── */}
        <section className="w-1/4 min-h-0 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-slate-500">Inbox (12)</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Assigned Only</span>
              <button className="w-8 h-4 bg-[#d4af37]/20 rounded-full relative transition-colors">
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-[#d4af37] rounded-full shadow-sm" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1 space-y-1 custom-scrollbar">

            {/* Active / selected thread */}
            <div className="p-4 rounded-lg bg-slate-50 border border-[#d4af37]/20 relative cursor-pointer">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-body-sm text-slate-900">Bekele (Assigned)</span>
                <span className="font-data-mono text-[10px] text-slate-400">10:42 AM</span>
              </div>
              <p className="text-body-sm text-slate-600 truncate">&ldquo;Thanks Abebe, saw the EUR/USD trade win update!&rdquo;</p>
              <div className="absolute right-4 bottom-4 w-2 h-2 bg-blue-500 rounded-full" />
            </div>

            {/* Thread */}
            <div className="p-4 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-body-sm text-slate-900 group-hover:text-[#d4af37] transition-colors">Chala (Assigned)</span>
                <span className="font-data-mono text-[10px] text-slate-400">09:15 AM</span>
              </div>
              <p className="text-body-sm text-slate-400 truncate">&ldquo;Can you review my account drawdown limit?&rdquo;</p>
            </div>

            {/* Thread */}
            <div className="p-4 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group border-l-4 border-transparent">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-body-sm text-slate-900 group-hover:text-[#d4af37] transition-colors">Invesco Cap Fund</span>
                <span className="font-data-mono text-[10px] text-slate-400">Yesterday</span>
              </div>
              <p className="text-body-sm text-slate-400 truncate">&ldquo;KYC verification documents attached.&rdquo;</p>
            </div>

            {/* Thread (dimmed) */}
            <div className="p-4 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer opacity-60">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-body-sm text-slate-900">Sahle-Work Z.</span>
                <span className="font-data-mono text-[10px] text-slate-400">Oct 24</span>
              </div>
              <p className="text-body-sm text-slate-400 truncate">&ldquo;Withdrawal request status update needed.&rdquo;</p>
            </div>

          </div>
        </section>

        {/* ── Panel 2: Active Chat (50%) ─────────────────────────────────── */}
        <section className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">

          {/* Chat header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-10 h-10 rounded-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeXrTFjTjMQtIPyZuR88i_Aa6SQhuIbatYOzDBaXLzKkEdjO5JcYztqRC_HEU_ipBkmiRQfBlMTG6uq4axUgYsrgADBFVsTcvIq5sZQ8wwcw_P2GfjtvRLc7wDdobdELBZcVTjcwhZhx2Ff3X3NHIKty1LXzgdDCnYDKqkIj-DSaDglIQqdopQMxnYW6NGSw1ls3UrRYGTr1cvzEZ_LpE7CUmLc6gdv6hBcMRxZArLXOH5ZnVFRLOE_6UQ57lr3EJN8stq6pX7rm8"
                  alt="Bekele"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-body-lg text-slate-900 leading-none">Bekele</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Live Online
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-body-sm text-slate-400">Assigned Manager:</span>
                  <span className="text-body-sm font-semibold text-[#d4af37]">Abebe</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">call</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">videocam</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </div>

          {/* Message stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            <div className="flex justify-center">
              <span className="bg-slate-200/50 px-4 py-1 rounded-full text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Today
              </span>
            </div>

            {/* Client message */}
            <div className="flex gap-4 max-w-[80%]">
              <div className="flex-shrink-0 mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-8 h-8 rounded-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqcLddj5rtVWu3xQLDr85NXs60EZzdcusMkzLUC1MLc5seuaP2cLJXR1hXfYbCsa47RXO7hIiDFNgnOpzWiv6y5gXL0MujfHRNEsLcY_w3s2PG-4Y1Fl9TaJrrtvhAYnIrBVOecvaoC5jHGpBijSoK3v1eucWwbJfOiSn0Av0-IEk9CXwDUD-Unr0hSNQz-1cR5v6z_fRwissE2nc4aKHDtqtGfmEUhzuPNsI2d5vmm2alDKn1RQQe_WorewgDot1pg7RUi1vaOFc"
                  alt="Bekele avatar"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="chat-bubble-client p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <p className="text-body-md text-slate-700 leading-relaxed">
                    Hello Abebe, I noticed the live MT5 trade entries are syncing on my user dashboard.
                    Quick question about the leverage used for the EUR/USD position?
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 ml-2">10:40 AM</span>
              </div>
            </div>

            {/* Manager message */}
            <div className="flex flex-row-reverse gap-4 ml-auto max-w-[80%]">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-[#d4af37] font-bold">
                  A
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="chat-bubble-manager p-4 rounded-2xl rounded-tr-none shadow-md text-white">
                  <p className="text-body-md leading-relaxed">
                    Hi Bekele! Yes, we safely executed that entry at 1:100 leverage to maximize the
                    tight spread entry. It&apos;s performing perfectly within our risk management parameters.
                  </p>
                </div>
                <div className="flex items-center gap-1 mr-2">
                  <span className="text-[10px] text-slate-400">10:42 AM</span>
                  <span className="material-symbols-outlined text-[14px] text-[#d4af37]">done_all</span>
                </div>
              </div>
            </div>

            {/* Typing indicator */}
            <div className="flex gap-4 max-w-[80%] animate-pulse opacity-40">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="bg-slate-200 w-24 h-8 rounded-full" />
            </div>
          </div>

          {/* Message input */}
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-[#d4af37]/20 transition-all">
              <button className="text-slate-400 hover:text-[#d4af37] transition-colors">
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 text-body-md text-slate-900 placeholder:text-slate-400 outline-none"
                placeholder="Type your message to Bekele..."
                type="text"
              />
              <div className="flex items-center gap-2">
                <button className="text-slate-400 hover:text-[#d4af37] transition-colors">
                  <span className="material-symbols-outlined">mood</span>
                </button>
                <button className="bg-[#d4af37] text-[#3c2f00] font-bold px-6 py-2 rounded-lg text-body-sm hover:opacity-90 active:scale-95 transition-all">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Panel 3: Investor Overview (25%) ───────────────────────────── */}
        <section className="w-1/4 min-h-0 space-y-4 overflow-y-auto pr-1 custom-scrollbar">

          {/* Wallet Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h4 className="font-label-caps text-label-caps text-slate-400 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              Investor Wallet Summary
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-body-sm text-slate-500">Total Capital</p>
                <p className="text-headline-md font-bold text-slate-900 font-data-mono">$450,000.00</p>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-body-sm text-slate-500 mb-1">Managed Allocation Pool</p>
                <div className="flex items-center gap-2">
                  <span className="bg-[#d4af37]/10 text-[#d4af37] px-2 py-1 rounded text-[10px] font-bold border border-[#d4af37]/20">
                    Forex Alpha
                  </span>
                  <span className="text-emerald-500 font-bold text-body-sm">+12.4% YTD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Open Positions Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-label-caps text-label-caps text-slate-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">monitoring</span>
                Open Positions
              </h4>
              <span className="text-[10px] font-data-mono text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">
                LIVE
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-bold text-body-sm text-slate-900">EUR/USD</p>
                  <p className="text-[10px] text-slate-400">Buy @ 1.0845</p>
                </div>
                <div className="text-right">
                  <p className="font-data-mono font-bold text-emerald-500">+$2,450.00</p>
                  <p className="text-[10px] text-slate-400">Lot: 2.50</p>
                </div>
              </div>
              <div className="p-2 rounded-lg border border-dashed border-slate-200 text-center">
                <button className="text-[#d4af37] text-[11px] font-bold hover:underline">
                  View All Positions (4)
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#d4af37] transition-colors">terminal</span>
                <span className="font-body-sm font-semibold text-slate-700">Open Terminal Logs</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#d4af37] transition-colors">verified_user</span>
                <span className="font-body-sm font-semibold text-slate-700">Route to Compliance</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>
            </button>

            <button className="w-full p-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:opacity-95 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              Mark Ticket as Resolved
            </button>
          </div>

        </section>
      </div>
    </div>
  );
}
