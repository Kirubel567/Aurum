import { formatUSD } from "@/src/lib/formatters/currency";
import type { DashboardMetrics } from "@/src/types/dashboard.types";

interface DashboardTablesProps {
  metrics: DashboardMetrics;
}

export function DashboardTables({ metrics }: DashboardTablesProps) {
  const { bestTrades, investmentDistribution } = metrics;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <h3 className="mb-6 text-sm font-bold text-gray-900">
          Top 5 Best Performing Trades
        </h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
              <th className="pb-3">Asset</th>
              <th className="pb-3">Entry/Exit</th>
              <th className="pb-3">Profit</th>
              <th className="pb-3">Risk/Reward</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {bestTrades.map((trade) => (
              <tr
                key={`${trade.asset}-${trade.entryExit}`}
                className="border-b border-gray-50 last:border-0"
              >
                <td className="py-4 font-bold">{trade.asset}</td>
                <td className="py-4 text-gray-600">{trade.entryExit}</td>
                <td className="py-4 font-bold text-[#10b981]">
                  {trade.profit >= 100
                    ? formatUSD(trade.profit)
                    : `+${formatUSD(trade.profit)}`}
                </td>
                <td className="py-4 font-bold text-gray-900">
                  {trade.riskReward}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <h3 className="mb-6 text-sm font-bold text-gray-900">
          My Investment Distribution
        </h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
              <th className="pb-3">Strategy</th>
              <th className="pb-3">Pools</th>
              <th className="pb-3">Distribution</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {investmentDistribution.map((row, index) => (
              <tr
                key={`${row.strategy}-${index}`}
                className="border-b border-gray-50 last:border-0"
              >
                <td className="py-4 font-bold">{row.strategy}</td>
                <td className="py-4 font-medium text-gray-600">{row.pool}</td>
                <td className="py-4 font-bold text-gray-900">
                  {row.distribution.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
