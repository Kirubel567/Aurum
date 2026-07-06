import { Clock, ArrowUpCircle } from "lucide-react";

// Withdrawals are temporarily gated while the payout policy is finalised.
// The full WithdrawPage (src/features/withdraw/components/WithdrawPage.tsx)
// and its backend routes are intact — swap this stub back to <WithdrawPage />
// to re-enable.
export default function WithdrawRoute() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/30">
          <ArrowUpCircle className="size-8 text-[#C5A059]" />
        </div>
        <h1 className="mb-2 text-xl font-extrabold text-slate-900 dark:text-white">
          Withdrawals Coming Soon
        </h1>
        <p className="mb-6 text-sm leading-6 text-slate-500 dark:text-white/50">
          Withdrawal processing is being finalised and will be available shortly.
          Your funds remain fully secure in your wallet, and your trading capital
          continues to work in the meantime.
        </p>
        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-white/40">
          <Clock className="size-4" />
          We&apos;ll notify you the moment withdrawals open.
        </div>
      </div>
    </div>
  );
}
