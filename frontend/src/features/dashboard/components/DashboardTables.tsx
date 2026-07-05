import { formatUSD } from "@/src/lib/formatters/currency";
import type { DashboardTrading } from "@/src/features/dashboard/hooks/useDashboardData";

interface DashboardTablesProps {
  trading: DashboardTrading | null; // real (Phase 2)
}

export function DashboardTables({ trading }: DashboardTablesProps) {
  const bestTrades = trading?.bestTrades ?? [];
  const investmentDistribution = trading?.distribution ?? [];

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Best Performing Trades */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
        <h3 className="mb-6 text-sm font-bold text-gray-900 dark:text-white">
          Top 5 Best Performing Trades
        </h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/10 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
              <th className="pb-3">Asset</th>
              <th className="pb-3">Entry/Exit</th>
              <th className="pb-3">Profit</th>
              <th className="pb-3">Risk/Reward</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {bestTrades.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[11px] text-gray-400 dark:text-white/40">
                  Appears once trades close.
                </td>
              </tr>
            )}
            {bestTrades.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-gray-50 dark:border-white/5 last:border-0"
              >
                <td className="py-4 font-bold text-gray-900 dark:text-white">{trade.asset}</td>
                <td className="py-4 text-gray-600 dark:text-white/60">{trade.entryExit}</td>
                <td className={`py-4 font-bold ${trade.profit >= 0 ? "text-[#10b981]" : "text-red-500"}`}>
                  {trade.profit >= 0 ? `+${formatUSD(trade.profit)}` : formatUSD(trade.profit)}
                </td>
                <td className="py-4 font-bold text-gray-900 dark:text-white">
                  {trade.riskReward}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Investment Distribution */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
        <h3 className="mb-6 text-sm font-bold text-gray-900 dark:text-white">
          My Investment Distribution
        </h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/10 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
              <th className="pb-3">Strategy</th>
              <th className="pb-3">Pools</th>
              <th className="pb-3">Distribution</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {investmentDistribution.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-[11px] text-gray-400 dark:text-white/40">
                  Pool allocations appear after your first approved deposit.
                </td>
              </tr>
            )}
            {investmentDistribution.map((row, index) => (
              <tr
                key={`${row.strategy}-${index}`}
                className="border-b border-gray-50 dark:border-white/5 last:border-0"
              >
                <td className="py-4 font-bold text-gray-900 dark:text-white">{row.strategy}</td>
                <td className="py-4 font-medium text-gray-600 dark:text-white/60">{row.pool}</td>
                <td className="py-4 font-bold text-gray-900 dark:text-white">
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
