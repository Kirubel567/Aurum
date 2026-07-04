"use client";

import { PerformanceChart } from "@/src/shared/charts/PerformanceChart";
import type { DashboardMetrics } from "@/src/types/dashboard.types";
import type {
  DashboardTrading,
  EquityCurve,
} from "@/src/features/dashboard/hooks/useDashboardData";

interface FundEquitySectionProps {
  metrics: DashboardMetrics; // mock — only risk metrics left on it (Phase 16)
  curve: EquityCurve | null; // real (Phase 1)
  trading: DashboardTrading | null; // real (Phase 2)
}

export function FundEquitySection({ metrics, curve, trading }: FundEquitySectionProps) {
  const { riskMetrics } = metrics;
  const gainerLoser = trading?.gainerLoser ?? { profitable: [], unprofitable: [] };
  const equityDrawdown = curve?.points ?? [];

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Main chart card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] xl:col-span-9 dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Fund Equity &amp; Drawdown</h3>
          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-600 dark:text-white/40">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded bg-[#c4a24d] dark:bg-[#c4a24d]" />
              Total fund equity
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded bg-red-500" />
              Max Drawdown
            </span>
          </div>
        </div>
        <PerformanceChart data={equityDrawdown} />
        <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-white/40">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-3 rounded-sm bg-[#c4a24d]" />
            Total Fund Equity
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-3 rounded-sm bg-red-500" />
            Max Drawdown
          </span>
        </div>
      </div>

      <div className="space-y-6 xl:col-span-3">
        {/* Gainer/Loser */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
          <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">
            Top Gainer/Loser Assets
          </h3>
          {gainerLoser.profitable.length === 0 && gainerLoser.unprofitable.length === 0 && (
            <p className="py-4 text-center text-[11px] text-gray-400 dark:text-white/40">
              Appears once trades close.
            </p>
          )}
          <div className="mb-4">
            <div className="mb-2 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
              Top 3 profitable
            </div>
            {gainerLoser.profitable.map((item) => (
              <div
                key={item.name}
                className="mb-1 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-gray-600 dark:text-white/60">{item.name}</span>
                <span className="font-bold text-[#10b981]">{item.value}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
              Top 3 unprofitable
            </div>
            {gainerLoser.unprofitable.map((item) => (
              <div
                key={`${item.name}-${item.value}`}
                className="mb-1 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-gray-600 dark:text-white/60">{item.name}</span>
                <span className="font-bold text-[#ef4444]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
          <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">Risk Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-gray-50 dark:border-white/5 pb-2">
              <div>
                <div className="mb-1 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
                  Leverage Ratio
                </div>
                <div className="text-xs font-bold text-gray-800 dark:text-white/80">Leverage</div>
              </div>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white">{riskMetrics.leverage}</div>
            </div>
            <div className="flex items-end justify-between border-b border-gray-50 dark:border-white/5 pb-2">
              <div>
                <div className="mb-1 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
                  Volatility Index
                </div>
                <div className="text-xs font-bold text-gray-800 dark:text-white/80">VIX at</div>
              </div>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white">{riskMetrics.vix}</div>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
                Drawdown Alert
              </div>
              <div className="mb-1 text-xs text-gray-500 dark:text-white/40">Current Drawdown:</div>
              <div className="text-sm font-bold text-[#10b981]">
                {riskMetrics.drawdownPercent}% ({riskMetrics.drawdownZone})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
