"use client";

import { PerformanceChart } from "@/src/shared/charts/PerformanceChart";
import type { DashboardMetrics } from "@/src/types/dashboard.types";

interface FundEquitySectionProps {
  metrics: DashboardMetrics;
}

export function FundEquitySection({ metrics }: FundEquitySectionProps) {
  const { equityDrawdown, gainerLoser, riskMetrics } = metrics;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] xl:col-span-9">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Fund Equity & Drawdown</h3>
          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-600">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded bg-green-500" />
              Total fund equity
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded bg-red-500" />
              Max Drawdown
            </span>
          </div>
        </div>
        <PerformanceChart data={equityDrawdown} />
        <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-wider text-gray-600">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-3 rounded-sm bg-green-500" />
            Total Fund Equity
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-3 rounded-sm bg-red-500" />
            Max Drawdown
          </span>
        </div>
      </div>

      <div className="space-y-6 xl:col-span-3">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
          <h3 className="mb-4 text-sm font-bold text-gray-900">
            Top Gainer/Loser Assets
          </h3>
          <div className="mb-4">
            <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase">
              Top 3 profitable
            </div>
            {gainerLoser.profitable.map((item) => (
              <div
                key={item.name}
                className="mb-1 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-gray-600">{item.name}</span>
                <span className="font-bold text-[#10b981]">{item.value}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase">
              Top 3 unprofitable
            </div>
            {gainerLoser.unprofitable.map((item) => (
              <div
                key={`${item.name}-${item.value}`}
                className="mb-1 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-gray-600">{item.name}</span>
                <span className="font-bold text-[#ef4444]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Risk Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-gray-50 pb-2">
              <div>
                <div className="mb-1 text-[10px] font-bold text-gray-400 uppercase">
                  Leverage Ratio
                </div>
                <div className="text-xs font-bold text-gray-800">Leverage</div>
              </div>
              <div className="text-sm font-extrabold">{riskMetrics.leverage}</div>
            </div>
            <div className="flex items-end justify-between border-b border-gray-50 pb-2">
              <div>
                <div className="mb-1 text-[10px] font-bold text-gray-400 uppercase">
                  Volatility Index
                </div>
                <div className="text-xs font-bold text-gray-800">VIX at</div>
              </div>
              <div className="text-sm font-extrabold">{riskMetrics.vix}</div>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-gray-900">
                Drawdown Alert
              </div>
              <div className="mb-1 text-xs text-gray-500">Current Drawdown:</div>
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
