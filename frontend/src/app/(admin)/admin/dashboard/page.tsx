"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/src/lib/constants/routes";

// ── Mock chart paths per time range ───────────────────────────────────────────
const CHART_PATHS: Record<string, { area: string; line: string }> = {
  "1M": {
    line: "M0,280 L100,250 L200,260 L300,200 L400,220 L500,150 L600,180 L700,100 L800,120 L900,50 L1000,70",
    area: "M0,280 L100,250 L200,260 L300,200 L400,220 L500,150 L600,180 L700,100 L800,120 L900,50 L1000,70 L1000,300 L0,300 Z",
  },
  "3M": {
    line: "M0,290 L100,270 L200,240 L300,230 L400,200 L500,180 L600,160 L700,140 L800,110 L900,80 L1000,60",
    area: "M0,290 L100,270 L200,240 L300,230 L400,200 L500,180 L600,160 L700,140 L800,110 L900,80 L1000,60 L1000,300 L0,300 Z",
  },
  "1Y": {
    line: "M0,295 L100,280 L200,260 L300,250 L400,220 L500,190 L600,160 L700,130 L800,100 L900,70 L1000,40",
    area: "M0,295 L100,280 L200,260 L300,250 L400,220 L500,190 L600,160 L700,130 L800,100 L900,70 L1000,40 L1000,300 L0,300 Z",
  },
  ALL: {
    line: "M0,298 L100,285 L200,270 L300,245 L400,210 L500,175 L600,145 L700,115 L800,85 L900,55 L1000,30",
    area: "M0,298 L100,285 L200,270 L300,245 L400,210 L500,175 L600,145 L700,115 L800,85 L900,55 L1000,30 L1000,300 L0,300 Z",
  },
};

const CHART_LABELS: Record<string, string[]> = {
  "1M": ["01 OCT", "08 OCT", "15 OCT", "22 OCT", "29 OCT"],
  "3M": ["01 AUG", "01 SEP", "01 OCT", "15 OCT", "29 OCT"],
  "1Y": ["JAN", "MAR", "JUN", "SEP", "OCT"],
  ALL: ["2020", "2021", "2022", "2023", "2024"],
};

// ── Mock activity feed ─────────────────────────────────────────────────────────
const ACTIVITIES = [
  {
    id: 1,
    icon: "verified",
    iconBg: "bg-[#4edea3]/10 dark:bg-[#4edea3]/10 bg-green-50",
    iconColor: "text-[#00a572] dark:text-[#4edea3]",
    title: "New User Verified",
    detail: "Investor: Marcus Sterling (Tier 1)",
    time: "2 mins ago",
    meta: { userId: "USR-8821", tier: "Tier 1", country: "USA", kyc: "Approved" },
  },
  {
    id: 2,
    icon: "account_balance",
    iconBg: "bg-amber-50 dark:bg-[#d4af37]/10",
    iconColor: "text-[#d4af37]",
    title: "Large Deposit Approved",
    detail: "Amount: +$250,000.00 USD",
    time: "14 mins ago",
    meta: { txId: "DEP-4412", amount: "$250,000.00", currency: "USD", method: "Wire Transfer" },
  },
  {
    id: 3,
    icon: "warning",
    iconBg: "bg-red-50 dark:bg-[#ffb4ab]/10",
    iconColor: "text-red-500 dark:text-[#ffb4ab]",
    title: "Failed Login Attempt",
    detail: "IP: 192.168.1.104 (Tokyo, JP)",
    time: "42 mins ago",
    meta: { ip: "192.168.1.104", location: "Tokyo, JP", attempts: 3, blocked: "Yes" },
  },
  {
    id: 4,
    icon: "shield",
    iconBg: "bg-indigo-50 dark:bg-[#ffbec1]/10",
    iconColor: "text-indigo-500 dark:text-[#ffbec1]",
    title: "System Update Completed",
    detail: "Version 4.2.0-hotfix deployed",
    time: "1h 12m ago",
    meta: { version: "4.2.0-hotfix", deployedBy: "CI/CD Pipeline", status: "Success", duration: "3m 14s" },
  },
  {
    id: 5,
    icon: "swap_horiz",
    iconBg: "bg-teal-50 dark:bg-[#4edea3]/10",
    iconColor: "text-teal-600 dark:text-[#4edea3]",
    title: "Liquidity Rebalanced",
    detail: "Pool: BTC/USDT Alpha V3",
    time: "2h 4m ago",
    meta: { pool: "BTC/USDT Alpha V3", rebalancedBy: "Auto-bot v2", change: "+$1.2M", newRatio: "50/50" },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function downloadBlob(content: string, filename: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mockReportCSV() {
  return [
    "Aurum Sovereign Capital — Executive Dashboard Report",
    `Generated: ${new Date().toISOString()}`,
    "",
    "KPI,Value,Change",
    "Total AUM,$1.24B,+4.2%",
    "Active Users,12842,+128 today",
    "24h Volume,$84.2M,-1.5%",
    "System Health,99.99%,Stable",
    "",
    "Alpha Score,92.4,+1.2%",
    "Security Tier,Institutional,",
    "Data Integrity,Verified,",
  ].join("\n");
}

function mockActivityCSV() {
  const header = "Event,Detail,Timestamp\n";
  const rows = ACTIVITIES.map((a) => `"${a.title}","${a.detail}","${a.time}"`).join("\n");
  return header + rows;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeRange, setActiveRange] = useState<"1M" | "3M" | "1Y" | "ALL">("1M");
  const [liveFeed, setLiveFeed] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<(typeof ACTIVITIES)[0] | null>(null);

  const handleExportReport = useCallback(() => {
    downloadBlob(mockReportCSV(), `aurum-dashboard-${Date.now()}.csv`);
  }, []);

  const handleExportLogs = useCallback(() => {
    downloadBlob(mockActivityCSV(), `aurum-activity-logs-${Date.now()}.csv`);
  }, []);

  const chart = CHART_PATHS[activeRange];
  const labels = CHART_LABELS[activeRange];

  return (
    <>
      <div className="h-full overflow-y-auto px-4 sm:px-6 pt-6 pb-10 max-w-[1440px]">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <section className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div>
            <h2 className="text-[24px] leading-[32px] font-semibold text-gray-900 dark:text-[#dce3f0] mb-1">
              Executive Dashboard
            </h2>
            <p className="text-gray-500 dark:text-[#d0c5af] text-[14px] leading-[20px]">
              Real-time institutional liquidity and performance oversight.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportReport}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-lg text-[14px] hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-[#dce3f0] transition-colors"
            >
              Export Report
            </button>
            <button
              onClick={() => setLiveFeed((v) => !v)}
              className={`px-4 py-2 rounded-lg text-[14px] font-bold transition-all ${
                liveFeed
                  ? "bg-[#4edea3] text-[#003824] gold-glow"
                  : "bg-[#d4af37] text-[#3c2f00] gold-glow hover:scale-[1.02] active:scale-95"
              }`}
            >
              {liveFeed ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#003824] animate-pulse" />
                  Live — On
                </span>
              ) : (
                "Real-time Feed"
              )}
            </button>
          </div>
        </section>

        {/* ── KPI grid ────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">

          {/* Total AUM */}
          <div
            className="light-card p-6 rounded-xl cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_LIQUIDITY)}
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 dark:text-[#d0c5af] uppercase">
                Total AUM
              </p>
              <span className="text-[#00a572] dark:text-[#4edea3] text-xs font-data-mono flex items-center gap-1 font-bold">
                +4.2%{" "}
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
              </span>
            </div>
            <h3 className="text-[32px] text-[#d4af37] font-bold mb-2">$1.24B</h3>
            <div className="h-14 w-full overflow-visible">
              <svg className="w-full h-full overflow-visible" viewBox="0 -8 100 38">
                <defs>
                  <linearGradient id="sparkline-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path stroke="#d4af37" strokeWidth="2" fill="none" d="M0,26 Q10,18 20,22 T40,14 T60,20 T80,10 T100,15" />
                <path fill="url(#sparkline-grad)" opacity="0.1" d="M0,26 Q10,18 20,22 T40,14 T60,20 T80,10 T100,15 L100,30 L0,30 Z" />
              </svg>
            </div>
          </div>

          {/* Active Users */}
          <div
            className="light-card p-6 rounded-xl cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_USERS)}
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 dark:text-[#d0c5af] uppercase">
                Active Users
              </p>
              <span className="text-gray-400 dark:text-[#99907c] text-xs font-data-mono">
                {liveFeed ? <span className="text-[#4edea3] animate-pulse">● Live</span> : "Live now"}
              </span>
            </div>
            <h3 className="text-[32px] text-gray-900 dark:text-[#dce3f0] font-bold mb-2">
              {liveFeed ? "12,847" : "12,842"}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border border-white dark:border-[#050b14] bg-gray-200 dark:bg-[#2e353f]" />
                <div className="w-6 h-6 rounded-full border border-white dark:border-[#050b14] bg-gray-300 dark:bg-[#242a34]" />
                <div className="w-6 h-6 rounded-full border border-white dark:border-[#050b14] bg-gray-400 dark:bg-[#19202a]" />
              </div>
              <span className="text-xs text-gray-500 dark:text-[#d0c5af]">+128 joined today</span>
            </div>
          </div>

          {/* 24h Volume */}
          <div
            className="light-card p-6 rounded-xl cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_CONSOLE)}
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 dark:text-[#d0c5af] uppercase">
                24h Volume
              </p>
              <span className="text-red-600 dark:text-[#ffb4ab] text-xs font-data-mono flex items-center gap-1 font-bold">
                -1.5%{" "}
                <span className="material-symbols-outlined text-[14px]">trending_down</span>
              </span>
            </div>
            <h3 className="text-[32px] text-gray-900 dark:text-[#dce3f0] font-bold mb-2">$84.2M</h3>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#d4af37] w-2/3" />
              </div>
              <span className="text-[10px] font-data-mono text-gray-500 dark:text-[#d0c5af]">Target: $100M</span>
            </div>
          </div>

          {/* System Health */}
          <div className="light-card p-6 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 dark:text-[#d0c5af] uppercase">
                System Health
              </p>
              <span className="flex items-center gap-1 text-[#00a572] dark:text-[#4edea3] text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00a572] dark:bg-[#4edea3] animate-pulse" />
                Stable
              </span>
            </div>
            <h3 className="text-[32px] text-gray-900 dark:text-[#dce3f0] font-bold mb-2 relative z-10">
              99.99%
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#d0c5af] relative z-10">Latency: 12ms avg</p>
            <div className="absolute -bottom-10 -right-10 opacity-5">
              <span className="material-symbols-outlined text-[#d4af37]" style={{ fontSize: 120 }}>
                verified_user
              </span>
            </div>
          </div>
        </section>

        {/* ── Market Overview ─────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="light-card rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[20px] font-semibold text-gray-900 dark:text-[#dce3f0]">Market Overview</h4>
              <div className="flex bg-gray-100 dark:bg-black/20 rounded-lg p-1">
                {(["1M", "3M", "1Y", "ALL"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveRange(range)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                      activeRange === range
                        ? "bg-[#d4af37] text-[#3c2f00]"
                        : "text-gray-500 dark:text-[#d0c5af] hover:text-gray-900 dark:hover:text-[#dce3f0]"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] relative w-full overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-end">
                <svg className="w-full h-[240px]" preserveAspectRatio="none" viewBox="0 0 1000 300">
                  <defs>
                    <linearGradient id="main-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={chart.area} fill="url(#main-grad)" style={{ transition: "d 0.4s ease" }} />
                  <path
                    d={chart.line}
                    fill="none"
                    stroke="#d4af37"
                    strokeLinecap="round"
                    strokeWidth="3"
                    style={{ transition: "d 0.4s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <div className="border-b border-gray-100 dark:border-white/5 w-full h-0" />
                  <div className="border-b border-gray-100 dark:border-white/5 w-full h-0" />
                  <div className="border-b border-gray-100 dark:border-white/5 w-full h-0" />
                  <div className="border-b border-gray-100 dark:border-white/5 w-full h-0" />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4 px-2">
              {labels.map((label) => (
                <span key={label} className="text-[10px] font-data-mono text-gray-400 dark:text-[#99907c]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Recent Activity + Right panel ───────────────────────────────── */}
        <section className="mb-6">
          <div className="light-card rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[20px] font-semibold text-gray-900 dark:text-[#dce3f0]">Recent Activity</h4>
              <button
                onClick={() => router.push(ROUTES.ADMIN_CONSOLE)}
                className="text-[#d4af37] text-[10px] tracking-[0.05em] font-bold hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {ACTIVITIES.map((activity, i) => (
                <div
                  key={activity.id}
                  className="flex gap-4 group cursor-pointer"
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="mt-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.iconBg} ${activity.iconColor}`}>
                      <span className="material-symbols-outlined text-[18px]">{activity.icon}</span>
                    </div>
                  </div>
                  <div className={`flex-1 pb-4 ${i < ACTIVITIES.length - 1 ? "border-b border-gray-100 dark:border-white/5" : ""}`}>
                    <p className="text-[14px] text-gray-900 dark:text-[#dce3f0] font-semibold group-hover:text-[#d4af37] transition-colors">
                      {activity.title}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-[#d0c5af]">{activity.detail}</p>
                    <p className="text-[10px] font-data-mono text-gray-400 dark:text-[#99907c] mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleExportLogs}
                className="w-full py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[14px] text-gray-700 dark:text-[#dce3f0] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                Export Activity Logs
              </button>
            </div>
          </div>
        </section>

        {/* ── Bottom insight strip ─────────────────────────────────────────── */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="light-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-[#d0c5af] text-[11px] tracking-[0.05em] font-bold uppercase">
                Alpha Score
              </p>
              <p className="text-[18px] leading-[28px] font-bold text-gray-900 dark:text-[#dce3f0]">
                92.4{" "}
                <span className="text-[#00a572] dark:text-[#4edea3] text-xs">+1.2%</span>
              </p>
            </div>
          </div>

          <div className="light-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-[#4edea3]/20 flex items-center justify-center text-[#00a572] dark:text-[#4edea3]">
              <span className="material-symbols-outlined">security</span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-[#d0c5af] text-[11px] tracking-[0.05em] font-bold uppercase">
                Security Tier
              </p>
              <p className="text-[18px] leading-[28px] font-bold text-gray-900 dark:text-[#dce3f0]">Institutional</p>
            </div>
          </div>

          <div className="light-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-[#ffbec1]/20 flex items-center justify-center text-red-500 dark:text-[#ffbec1]">
              <span className="material-symbols-outlined">database</span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-[#d0c5af] text-[11px] tracking-[0.05em] font-bold uppercase">
                Data Integrity
              </p>
              <p className="text-[18px] leading-[28px] font-bold text-gray-900 dark:text-[#dce3f0]">Verified</p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Activity Detail Modal ────────────────────────────────────────────── */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="light-card rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedActivity.iconBg} ${selectedActivity.iconColor}`}>
                <span className="material-symbols-outlined text-[20px]">{selectedActivity.icon}</span>
              </div>
              <div>
                <p className="font-semibold text-[15px] text-gray-900 dark:text-[#dce3f0]">{selectedActivity.title}</p>
                <p className="text-[11px] text-gray-400 dark:text-[#99907c] font-data-mono">{selectedActivity.time}</p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              {Object.entries(selectedActivity.meta).map(([key, val]) => (
                <div key={key} className="flex justify-between text-[13px]">
                  <span className="text-gray-500 dark:text-[#d0c5af] capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-medium text-gray-900 dark:text-[#dce3f0]">{val}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelectedActivity(null)}
              className="w-full py-2 rounded-lg bg-[#d4af37] text-[#3c2f00] font-bold text-[14px] hover:bg-[#c9a830] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
