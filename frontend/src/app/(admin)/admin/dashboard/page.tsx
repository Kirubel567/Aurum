"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/src/lib/constants/routes";

// ── Types (match API responses) ────────────────────────────────────────────────

interface AumPoint {
  date: string;
  aum: number;
}

interface Metrics {
  totalAum: number;
  aumChangePct: number | null;
  activeInvestors: number;
  newInvestorsToday: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  dailyPnl: number;
  openTrades: number;
  chart: AumPoint[];
}

interface ActivityEvent {
  id: string;
  kind: "registration" | "deposit_submitted" | "message";
  title: string;
  detail: string;
  at: string;
  linkPath: string;
}

type Range = "1M" | "3M" | "1Y" | "ALL";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (compact && Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function downloadBlob(content: string, filename: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Build SVG line + area paths from real chart points (viewBox 1000x300).
function buildChartPaths(points: AumPoint[]) {
  if (points.length === 0) {
    return { line: "", area: "", min: 0, max: 0 };
  }
  const values = points.map((p) => p.aum);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1; // avoid /0 when flat
  const W = 1000;
  const H = 300;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 10;
  const usable = H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
    const y = PAD_TOP + (1 - (p.aum - min) / span) * usable;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const area = `${line} L${coords[coords.length - 1].x},${H} L${coords[0].x},${H} Z`;
  return { line, area, min, max };
}

// Pick up to 5 evenly-spaced date labels from the chart points.
function chartLabels(points: AumPoint[]): string[] {
  if (points.length === 0) return [];
  const n = Math.min(5, points.length);
  const labels: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i / (n - 1 || 1)) * (points.length - 1));
    const d = new Date(points[idx].date + "T00:00:00");
    labels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
    );
  }
  return labels;
}

const ACTIVITY_STYLE: Record<ActivityEvent["kind"], { icon: string; iconBg: string; iconColor: string }> = {
  registration:      { icon: "person_add",      iconBg: "bg-green-50 dark:bg-[#4edea3]/10",  iconColor: "text-[#00a572] dark:text-[#4edea3]" },
  deposit_submitted: { icon: "account_balance", iconBg: "bg-amber-50 dark:bg-[#d4af37]/10",  iconColor: "text-[#d4af37]" },
  message:           { icon: "mail",            iconBg: "bg-indigo-50 dark:bg-[#ffbec1]/10", iconColor: "text-indigo-500 dark:text-[#ffbec1]" },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeRange, setActiveRange] = useState<Range>("1M");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityEvent | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadMetrics = useCallback(async (range: Range) => {
    try {
      const res = await fetch(`/api/admin/dashboard/metrics?range=${range}`);
      if (!res.ok) throw new Error("metrics failed");
      setMetrics(await res.json());
      setMetricsError(false);
    } catch {
      setMetricsError(true);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity");
      if (!res.ok) return;
      const data = await res.json() as { events: ActivityEvent[] };
      setActivities(data.events ?? []);
    } catch {
      // keep last known list
    }
  }, []);

  useEffect(() => {
    loadMetrics(activeRange);
  }, [activeRange, loadMetrics]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Auto-refresh loop when the live toggle is on (every 30s).
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadMetrics(activeRange);
      loadActivity();
    }, 30_000);
    return () => clearInterval(timer);
  }, [autoRefresh, activeRange, loadMetrics, loadActivity]);

  const handleExportReport = useCallback(() => {
    if (!metrics) return;
    const csv = [
      "Aurum Sovereign Capital — Executive Dashboard Report",
      `Generated: ${new Date().toISOString()}`,
      "",
      "KPI,Value",
      `Total AUM,"${fmtUsd(metrics.totalAum)}"`,
      `AUM Change (${activeRange}),${metrics.aumChangePct != null ? `${metrics.aumChangePct}%` : "n/a"}`,
      `Active Investors,${metrics.activeInvestors}`,
      `New Investors Today,${metrics.newInvestorsToday}`,
      `Pending Deposits,${metrics.pendingDeposits}`,
      `Pending Withdrawals,${metrics.pendingWithdrawals}`,
      `Daily P&L,"${fmtUsd(metrics.dailyPnl)}"`,
      `Open Trades,${metrics.openTrades}`,
      "",
      "AUM History,Date,Value",
      ...metrics.chart.map((p) => `,${p.date},"${fmtUsd(p.aum)}"`),
    ].join("\n");
    downloadBlob(csv, `aurum-dashboard-${Date.now()}.csv`);
  }, [metrics, activeRange]);

  const handleExportLogs = useCallback(() => {
    const header = "Event,Detail,Timestamp\n";
    const rows = activities
      .map((a) => `"${a.title}","${a.detail.replace(/"/g, '""')}","${a.at}"`)
      .join("\n");
    downloadBlob(header + rows, `aurum-activity-logs-${Date.now()}.csv`);
  }, [activities]);

  const chartData = metrics?.chart ?? [];
  const { line, area } = buildChartPaths(chartData);
  const labels = chartLabels(chartData);

  const aumUp = (metrics?.aumChangePct ?? 0) >= 0;
  const pnlUp = (metrics?.dailyPnl ?? 0) >= 0;

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
              disabled={!metrics}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-lg text-[14px] hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-[#dce3f0] transition-colors disabled:opacity-50"
            >
              Export Report
            </button>
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`px-4 py-2 rounded-lg text-[14px] font-bold transition-all ${
                autoRefresh
                  ? "bg-[#4edea3] text-[#003824] gold-glow"
                  : "bg-[#d4af37] text-[#3c2f00] gold-glow hover:scale-[1.02] active:scale-95"
              }`}
            >
              {autoRefresh ? (
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

        {metricsError && (
          <div className="mb-6 bg-red-50 dark:bg-[#ffb4ab]/10 border border-red-200 dark:border-[#ffb4ab]/20 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-[#ffb4ab] flex items-center justify-between">
            <span>Failed to load dashboard metrics.</span>
            <button onClick={() => loadMetrics(activeRange)} className="font-bold underline">Retry</button>
          </div>
        )}

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
              {metrics?.aumChangePct != null && (
                <span className={`text-xs font-data-mono flex items-center gap-1 font-bold ${
                  aumUp ? "text-[#00a572] dark:text-[#4edea3]" : "text-red-600 dark:text-[#ffb4ab]"
                }`}>
                  {aumUp ? "+" : ""}{metrics.aumChangePct}%{" "}
                  <span className="material-symbols-outlined text-[14px]">
                    {aumUp ? "trending_up" : "trending_down"}
                  </span>
                </span>
              )}
            </div>
            <h3 className="text-[32px] text-[#d4af37] font-bold mb-2">
              {metrics ? fmtUsd(metrics.totalAum, true) : "—"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#d0c5af]">
              Sum of all investor wallet balances
            </p>
          </div>

          {/* Active Investors */}
          <div
            className="light-card p-6 rounded-xl cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_USERS)}
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 dark:text-[#d0c5af] uppercase">
                Active Investors
              </p>
              <span className="text-gray-400 dark:text-[#99907c] text-xs font-data-mono">
                {autoRefresh ? <span className="text-[#4edea3] animate-pulse">● Live</span> : "Approved"}
              </span>
            </div>
            <h3 className="text-[32px] text-gray-900 dark:text-[#dce3f0] font-bold mb-2">
              {metrics ? metrics.activeInvestors.toLocaleString() : "—"}
            </h3>
            <span className="text-xs text-gray-500 dark:text-[#d0c5af]">
              {metrics && metrics.newInvestorsToday > 0
                ? `+${metrics.newInvestorsToday} joined today`
                : "No new investors today"}
            </span>
          </div>

          {/* Pending Deposits */}
          <div
            className="light-card p-6 rounded-xl cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_DEPOSITS)}
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 dark:text-[#d0c5af] uppercase">
                Pending Reviews
              </p>
              {metrics && (metrics.pendingDeposits + metrics.pendingWithdrawals) > 0 ? (
                <span className="text-[#d4af37] text-xs font-data-mono font-bold flex items-center gap-1">
                  Action needed
                  <span className="material-symbols-outlined text-[14px]">priority_high</span>
                </span>
              ) : (
                <span className="text-[#00a572] dark:text-[#4edea3] text-xs font-data-mono font-bold">
                  All clear
                </span>
              )}
            </div>
            <h3 className="text-[32px] text-gray-900 dark:text-[#dce3f0] font-bold mb-2">
              {metrics ? metrics.pendingDeposits + metrics.pendingWithdrawals : "—"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#d0c5af]">
              {metrics
                ? `${metrics.pendingDeposits} deposits · ${metrics.pendingWithdrawals} withdrawals`
                : "Deposits and withdrawals"}
            </p>
          </div>

          {/* Daily P&L */}
          <div
            className="light-card p-6 rounded-xl cursor-pointer relative overflow-hidden"
            onClick={() => router.push(ROUTES.ADMIN_CONSOLE)}
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <p className="text-[12px] leading-[16px] tracking-[0.05em] font-bold text-gray-500 dark:text-[#d0c5af] uppercase">
                Daily P&amp;L
              </p>
              <span className={`flex items-center gap-1 text-xs font-bold ${
                pnlUp ? "text-[#00a572] dark:text-[#4edea3]" : "text-red-600 dark:text-[#ffb4ab]"
              }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  pnlUp ? "bg-[#00a572] dark:bg-[#4edea3]" : "bg-red-500 dark:bg-[#ffb4ab]"
                }`} />
                {pnlUp ? "Positive" : "Negative"}
              </span>
            </div>
            <h3 className={`text-[32px] font-bold mb-2 relative z-10 ${
              pnlUp ? "text-gray-900 dark:text-[#dce3f0]" : "text-red-600 dark:text-[#ffb4ab]"
            }`}>
              {metrics ? fmtUsd(metrics.dailyPnl, true) : "—"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#d0c5af] relative z-10">
              {metrics ? `Yield + realized P/L · ${metrics.openTrades} open trades` : "Today's yield + trades"}
            </p>
            <div className="absolute -bottom-10 -right-10 opacity-5">
              <span className="material-symbols-outlined text-[#d4af37]" style={{ fontSize: 120 }}>
                monitoring
              </span>
            </div>
          </div>
        </section>

        {/* ── AUM Overview ────────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="light-card rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[20px] font-semibold text-gray-900 dark:text-[#dce3f0]">AUM Overview</h4>
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
              {chartData.length < 2 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="material-symbols-outlined text-gray-300 dark:text-white/10" style={{ fontSize: 48 }}>
                    show_chart
                  </span>
                  <p className="text-sm text-gray-400 dark:text-[#99907c]">
                    {metrics
                      ? "Not enough history yet — the AUM curve builds as equity snapshots accumulate."
                      : "Loading chart…"}
                  </p>
                  {metrics && (
                    <p className="text-xs font-data-mono text-gray-400 dark:text-[#99907c]">
                      Current AUM: {fmtUsd(metrics.totalAum)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col justify-end">
                  <svg className="w-full h-[240px]" preserveAspectRatio="none" viewBox="0 0 1000 300">
                    <defs>
                      <linearGradient id="main-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#d4af37" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={area} fill="url(#main-grad)" style={{ transition: "d 0.4s ease" }} />
                    <path
                      d={line}
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
              )}
            </div>

            <div className="flex justify-between mt-4 px-2">
              {labels.map((label, i) => (
                <span key={`${label}-${i}`} className="text-[10px] font-data-mono text-gray-400 dark:text-[#99907c]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Recent Activity ─────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="light-card rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[20px] font-semibold text-gray-900 dark:text-[#dce3f0]">Recent Activity</h4>
              <button
                onClick={loadActivity}
                className="text-[#d4af37] text-[10px] tracking-[0.05em] font-bold hover:underline"
              >
                Refresh
              </button>
            </div>

            {activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-[#99907c]">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, i) => {
                  const style = ACTIVITY_STYLE[activity.kind];
                  return (
                    <div
                      key={activity.id}
                      className="flex gap-4 group cursor-pointer"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <div className="mt-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.iconBg} ${style.iconColor}`}>
                          <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
                        </div>
                      </div>
                      <div className={`flex-1 pb-4 ${i < activities.length - 1 ? "border-b border-gray-100 dark:border-white/5" : ""}`}>
                        <p className="text-[14px] text-gray-900 dark:text-[#dce3f0] font-semibold group-hover:text-[#d4af37] transition-colors">
                          {activity.title}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-[#d0c5af]">{activity.detail}</p>
                        <p className="text-[10px] font-data-mono text-gray-400 dark:text-[#99907c] mt-1">
                          {timeAgo(activity.at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleExportLogs}
                disabled={activities.length === 0}
                className="w-full py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[14px] text-gray-700 dark:text-[#dce3f0] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Export Activity Logs
              </button>
            </div>
          </div>
        </section>

        {/* ── Bottom insight strip ─────────────────────────────────────────── */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            className="light-card p-6 rounded-xl flex items-center gap-4 cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_CONSOLE)}
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
              <span className="material-symbols-outlined">candlestick_chart</span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-[#d0c5af] text-[11px] tracking-[0.05em] font-bold uppercase">
                Open Trades
              </p>
              <p className="text-[18px] leading-[28px] font-bold text-gray-900 dark:text-[#dce3f0]">
                {metrics ? metrics.openTrades : "—"}
              </p>
            </div>
          </div>

          <div
            className="light-card p-6 rounded-xl flex items-center gap-4 cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_DEPOSITS)}
          >
            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-[#4edea3]/20 flex items-center justify-center text-[#00a572] dark:text-[#4edea3]">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-[#d0c5af] text-[11px] tracking-[0.05em] font-bold uppercase">
                Pending Deposits
              </p>
              <p className="text-[18px] leading-[28px] font-bold text-gray-900 dark:text-[#dce3f0]">
                {metrics ? metrics.pendingDeposits : "—"}
              </p>
            </div>
          </div>

          <div
            className="light-card p-6 rounded-xl flex items-center gap-4 cursor-pointer"
            onClick={() => router.push(ROUTES.ADMIN_USERS)}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-[#ffbec1]/20 flex items-center justify-center text-red-500 dark:text-[#ffbec1]">
              <span className="material-symbols-outlined">group</span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-[#d0c5af] text-[11px] tracking-[0.05em] font-bold uppercase">
                New Today
              </p>
              <p className="text-[18px] leading-[28px] font-bold text-gray-900 dark:text-[#dce3f0]">
                {metrics ? metrics.newInvestorsToday : "—"}
              </p>
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
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ACTIVITY_STYLE[selectedActivity.kind].iconBg} ${ACTIVITY_STYLE[selectedActivity.kind].iconColor}`}>
                <span className="material-symbols-outlined text-[20px]">{ACTIVITY_STYLE[selectedActivity.kind].icon}</span>
              </div>
              <div>
                <p className="font-semibold text-[15px] text-gray-900 dark:text-[#dce3f0]">{selectedActivity.title}</p>
                <p className="text-[11px] text-gray-400 dark:text-[#99907c] font-data-mono">
                  {new Date(selectedActivity.at).toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-[13px] text-gray-600 dark:text-[#d0c5af] mb-5">{selectedActivity.detail}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  router.push(selectedActivity.linkPath);
                  setSelectedActivity(null);
                }}
                className="flex-1 py-2 rounded-lg bg-[#d4af37] text-[#3c2f00] font-bold text-[14px] hover:bg-[#c9a830] transition-colors"
              >
                Go to Page
              </button>
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-[#dce3f0] font-bold text-[14px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
