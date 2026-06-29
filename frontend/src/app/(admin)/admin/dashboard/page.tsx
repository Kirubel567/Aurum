// Direct conversion of the Stitch dashboard HTML.
// Sidebar + Navbar are provided by (admin)/layout.tsx — only the <main> canvas is here.
// Custom spacing tokens → standard Tailwind px equivalents.
// Stitch primary (#d4af37) hardcoded to avoid conflict with .theme-admin --primary (#0c1017).

export default function AdminDashboardPage() {
  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 pt-6 pb-10 max-w-[1440px]">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <section className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-[24px] leading-[32px] font-semibold text-gray-900 mb-1">
            Executive Dashboard
          </h2>
          <p className="text-gray-600 text-[14px] leading-[20px]">
            Real-time institutional liquidity and performance oversight.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-[14px] hover:bg-gray-50 text-gray-700 transition-colors">
            Export Report
          </button>
          <button className="bg-[#d4af37] text-[#3c2f00] px-4 py-2 rounded-lg text-[14px] font-bold gold-glow hover:scale-[1.02] active:scale-95 transition-transform">
            Real-time Feed
          </button>
        </div>
      </section>

      {/* ── KPI grid ─────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">

        {/* Total AUM */}
        <div className="light-card p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 uppercase">
              Total AUM
            </p>
            <span className="text-[#00a572] text-xs font-data-mono flex items-center gap-1 font-bold">
              +4.2%{" "}
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
            </span>
          </div>
          <h3 className="text-[32px] text-[#d4af37] font-bold mb-2">$1.24B</h3>
          <div className="h-12 w-full">
            <svg className="w-full h-full" viewBox="0 0 100 30">
              <defs>
                <linearGradient id="sparkline-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#d4af37" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                stroke="#d4af37"
                strokeWidth="2"
                fill="none"
                d="M0,25 Q10,15 20,20 T40,10 T60,18 T80,5 T100,12"
              />
              <path
                fill="url(#sparkline-grad)"
                opacity="0.1"
                d="M0,25 Q10,15 20,20 T40,10 T60,18 T80,5 T100,12 L100,30 L0,30 Z"
              />
            </svg>
          </div>
        </div>

        {/* Active Users */}
        <div className="light-card p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 uppercase">
              Active Users
            </p>
            <span className="text-gray-400 text-xs font-data-mono">Live now</span>
          </div>
          <h3 className="text-[32px] text-gray-900 font-bold mb-2">12,842</h3>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border border-white bg-gray-200" />
              <div className="w-6 h-6 rounded-full border border-white bg-gray-300" />
              <div className="w-6 h-6 rounded-full border border-white bg-gray-400" />
            </div>
            <span className="text-xs text-gray-500">+128 joined today</span>
          </div>
        </div>

        {/* 24h Volume */}
        <div className="light-card p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 uppercase">
              24h Volume
            </p>
            <span className="text-red-600 text-xs font-data-mono flex items-center gap-1 font-bold">
              -1.5%{" "}
              <span className="material-symbols-outlined text-[14px]">trending_down</span>
            </span>
          </div>
          <h3 className="text-[32px] text-gray-900 font-bold mb-2">$84.2M</h3>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#d4af37] w-2/3" />
            </div>
            <span className="text-[10px] font-data-mono text-gray-500">Target: $100M</span>
          </div>
        </div>

        {/* System Health */}
        <div className="light-card p-6 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 uppercase">
              System Health
            </p>
            <span className="flex items-center gap-1 text-[#00a572] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00a572] animate-pulse" />
              Stable
            </span>
          </div>
          <h3 className="text-[32px] text-gray-900 font-bold mb-2 relative z-10">
            99.99%
          </h3>
          <p className="text-xs text-gray-500 relative z-10">Latency: 12ms avg</p>
          <div className="absolute -bottom-10 -right-10 opacity-5">
            <span className="material-symbols-outlined text-[#d4af37]" style={{ fontSize: 120 }}>
              verified_user
            </span>
          </div>
        </div>
      </section>

      {/* ── Market Overview ──────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="light-card rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[20px] font-semibold text-gray-900">Market Overview</h4>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button className="px-3 py-1 rounded text-xs font-bold bg-[#d4af37] text-[#3c2f00]">
                1M
              </button>
              <button className="px-3 py-1 rounded text-xs text-gray-500 hover:text-gray-900 transition-colors">
                3M
              </button>
              <button className="px-3 py-1 rounded text-xs text-gray-500 hover:text-gray-900 transition-colors">
                1Y
              </button>
              <button className="px-3 py-1 rounded text-xs text-gray-500 hover:text-gray-900 transition-colors">
                ALL
              </button>
            </div>
          </div>

          <div className="h-[340px] relative w-full overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-end">
              <svg className="w-full h-[240px]" preserveAspectRatio="none" viewBox="0 0 1000 300">
                <defs>
                  <linearGradient id="main-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,280 L100,250 L200,260 L300,200 L400,220 L500,150 L600,180 L700,100 L800,120 L900,50 L1000,70 L1000,300 L0,300 Z"
                  fill="url(#main-grad)"
                />
                <path
                  d="M0,280 L100,250 L200,260 L300,200 L400,220 L500,150 L600,180 L700,100 L800,120 L900,50 L1000,70"
                  fill="none"
                  stroke="#d4af37"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between border-b border-gray-100 pb-2">
                <div className="border-b border-gray-100 w-full h-0" />
                <div className="border-b border-gray-100 w-full h-0" />
                <div className="border-b border-gray-100 w-full h-0" />
                <div className="border-b border-gray-100 w-full h-0" />
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4 px-2">
            {["01 OCT", "08 OCT", "15 OCT", "22 OCT", "29 OCT"].map((label) => (
              <span key={label} className="text-[10px] font-data-mono text-gray-400">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="light-card rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[20px] font-semibold text-gray-900">Recent Activity</h4>
            <button className="text-[#d4af37] text-[10px] tracking-[0.05em] font-bold hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {/* 1 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-[#00a572]">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
              </div>
              <div className="flex-1 border-b border-gray-100 pb-4">
                <p className="text-[14px] text-gray-900 font-semibold group-hover:text-[#d4af37] transition-colors">
                  New User Verified
                </p>
                <p className="text-[11px] text-gray-500">Investor: Marcus Sterling (Tier 1)</p>
                <p className="text-[10px] font-data-mono text-gray-400 mt-1">2 mins ago</p>
              </div>
            </div>

            {/* 2 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#d4af37]">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                </div>
              </div>
              <div className="flex-1 border-b border-gray-100 pb-4">
                <p className="text-[14px] text-gray-900 font-semibold group-hover:text-[#d4af37] transition-colors">
                  Large Deposit Approved
                </p>
                <p className="text-[11px] text-gray-500">Amount: +$250,000.00 USD</p>
                <p className="text-[10px] font-data-mono text-gray-400 mt-1">14 mins ago</p>
              </div>
            </div>

            {/* 3 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
              </div>
              <div className="flex-1 border-b border-gray-100 pb-4">
                <p className="text-[14px] text-gray-900 font-semibold group-hover:text-[#d4af37] transition-colors">
                  Failed Login Attempt
                </p>
                <p className="text-[11px] text-gray-500">IP: 192.168.1.104 (Tokyo, JP)</p>
                <p className="text-[10px] font-data-mono text-gray-400 mt-1">42 mins ago</p>
              </div>
            </div>

            {/* 4 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <span className="material-symbols-outlined text-[18px]">shield</span>
                </div>
              </div>
              <div className="flex-1 border-b border-gray-100 pb-4">
                <p className="text-[14px] text-gray-900 font-semibold group-hover:text-[#d4af37] transition-colors">
                  System Update Completed
                </p>
                <p className="text-[11px] text-gray-500">Version 4.2.0-hotfix deployed</p>
                <p className="text-[10px] font-data-mono text-gray-400 mt-1">1h 12m ago</p>
              </div>
            </div>

            {/* 5 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                </div>
              </div>
              <div className="flex-1 pb-4">
                <p className="text-[14px] text-gray-900 font-semibold group-hover:text-[#d4af37] transition-colors">
                  Liquidity Rebalanced
                </p>
                <p className="text-[11px] text-gray-500">Pool: BTC/USDT Alpha V3</p>
                <p className="text-[10px] font-data-mono text-gray-400 mt-1">2h 4m ago</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button className="w-full py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-700 hover:bg-gray-100 transition-colors">
              Export Activity Logs
            </button>
          </div>
        </div>
      </section>

      {/* ── Bottom insight strip ──────────────────────────────────────────── */}

      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="light-card p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-[#d4af37]">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <p className="text-gray-500 text-[11px] tracking-[0.05em] font-bold uppercase">
              Alpha Score
            </p>
            <p className="text-[18px] leading-[28px] font-bold text-gray-900">
              92.4{" "}
              <span className="text-[#00a572] text-xs">+1.2%</span>
            </p>
          </div>
        </div>

        <div className="light-card p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#00a572]">
            <span className="material-symbols-outlined">security</span>
          </div>
          <div>
            <p className="text-gray-500 text-[11px] tracking-[0.05em] font-bold uppercase">
              Security Tier
            </p>
            <p className="text-[18px] leading-[28px] font-bold text-gray-900">Institutional</p>
          </div>
        </div>

        <div className="light-card p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <span className="material-symbols-outlined">database</span>
          </div>
          <div>
            <p className="text-gray-500 text-[11px] tracking-[0.05em] font-bold uppercase">
              Data Integrity
            </p>
            <p className="text-[18px] leading-[28px] font-bold text-gray-900">Verified</p>
          </div>
        </div>
      </section>
    </div>
  );
}
