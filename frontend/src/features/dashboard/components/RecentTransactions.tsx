import { ArrowDownToLine, ArrowUpCircle, Receipt, Sparkles, Wrench } from "lucide-react";

import { formatUSD } from "@/src/lib/formatters/currency";
import type { DashboardSummary } from "@/src/features/dashboard/hooks/useDashboardData";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  deposit: { label: "Deposit", icon: ArrowDownToLine },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle },
  interest_credit: { label: "Yield Credit", icon: Sparkles },
  correction: { label: "Adjustment", icon: Wrench },
};

// Real data (Phase 1): the caller's latest 5 ledger entries.
export function RecentTransactions({
  transactions,
}: {
  transactions: DashboardSummary["recentTransactions"];
}) {
  return (
    <div className="mb-8 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
      <h3 className="mb-6 text-sm font-bold text-gray-900 dark:text-white">
        Recent Transactions
      </h3>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
            <Receipt className="size-5 text-gray-400 dark:text-white/40" />
          </div>
          <p className="text-xs font-semibold text-gray-500 dark:text-white/60">
            No transactions yet
          </p>
          <p className="text-[11px] text-gray-400 dark:text-white/40">
            Deposits, withdrawals and yield credits will appear here.
          </p>
        </div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/10 text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase">
              <th className="pb-3">Type</th>
              <th className="pb-3">Note</th>
              <th className="pb-3">Date</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {transactions.map((txn) => {
              const meta = TYPE_META[txn.type] ?? { label: txn.type, icon: Receipt };
              const Icon = meta.icon;
              const positive = txn.amount >= 0;
              return (
                <tr key={txn.id} className="border-b border-gray-50 dark:border-white/5 last:border-0">
                  <td className="py-4">
                    <span className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#C5A059]/10 text-[#C5A059] dark:bg-[#c4a24d]/15 dark:text-[#c4a24d]">
                        <Icon className="size-3.5" />
                      </span>
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-4 text-gray-600 dark:text-white/60">{txn.note ?? "—"}</td>
                  <td className="py-4 text-gray-500 dark:text-white/50">
                    {new Date(txn.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td
                    className={cn(
                      "py-4 text-right font-bold",
                      positive ? "text-[#10b981]" : "text-red-500"
                    )}
                  >
                    {positive ? "+" : ""}
                    {formatUSD(txn.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
