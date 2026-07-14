import { createServerClient } from "@/src/lib/supabase/server";

export type CurvePeriod = "day" | "week" | "month" | "year";

const PERIODS: Record<CurvePeriod, { windowMs: number; buckets: number }> = {
  day: { windowMs: 24 * 3600_000, buckets: 24 },   // hourly
  week: { windowMs: 7 * 86400_000, buckets: 7 },    // daily
  month: { windowMs: 30 * 86400_000, buckets: 30 }, // daily
  year: { windowMs: 365 * 86400_000, buckets: 12 }, // monthly
};

// Only these ledger entry types are TRADING performance. Deposits,
// withdrawals and admin adjustments move money in/out of the account but are
// not returns — they must never move the performance charts.
const TRADING_ENTRY_TYPES = ["interest_credit", "yield_credit", "trade_pl"];

export function isCurvePeriod(value: string): value is CurvePeriod {
  return value === "day" || value === "week" || value === "month" || value === "year";
}

function labelFor(date: Date, period: CurvePeriod): string {
  if (period === "day") {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (period === "year") {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface CurvePoint {
  date: string;
  equity: number;
  // Underwater drawdown, percent: 0 while equity is at its running peak,
  // negative while below it (e.g. -3.2 = 3.2% below the high-water mark).
  // This is the standard "underwater plot" series used in fund dashboards.
  drawdown: number;
}

// Cumulative TRADING P/L over the user's ledger, bucketed for the window.
// Shared by /api/dashboard/equity-curve and /api/orders/live.
//
// Depositing or withdrawing never moves this curve — it only reflects yield
// accruals and trade P/L. Before the first trading event exists the curve is
// EMPTY (points: []), so charts honestly show "no data yet" instead of a
// line that jumps whenever money is deposited.
export async function buildEquityCurve(
  userId: string,
  period: CurvePeriod
): Promise<{ points: CurvePoint[] }> {
  const db = createServerClient();
  const { data: entries, error } = await db
    .from("ledger_entries")
    .select("amount, created_at")
    .eq("account_id", userId)
    .in("entry_type", TRADING_ENTRY_TYPES)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`[equity-curve] ${error.message}`);

  // No trading activity yet — charts stay empty until the first trade/yield.
  if (!entries || entries.length === 0) {
    return { points: [] };
  }

  const { windowMs, buckets } = PERIODS[period];
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucketSize = windowMs / buckets;

  // Baseline: trading P/L accumulated before the window opens.
  let equity = 0;
  const inWindow: { at: number; amount: number }[] = [];
  for (const row of entries) {
    const at = new Date(row.created_at).getTime();
    if (at < windowStart) equity += Number(row.amount);
    else inWindow.push({ at, amount: Number(row.amount) });
  }

  let peak = equity;
  let idx = 0;
  const points: CurvePoint[] = Array.from({ length: buckets }, (_, i) => {
    const bucketEnd = windowStart + (i + 1) * bucketSize;
    while (idx < inWindow.length && inWindow[idx].at <= bucketEnd) {
      equity += inWindow[idx].amount;
      idx++;
    }
    peak = Math.max(peak, equity);
    const underwaterPct = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
    return {
      date: labelFor(new Date(bucketEnd), period),
      equity: Number(equity.toFixed(2)),
      drawdown: Number(underwaterPct.toFixed(2)),
    };
  });

  return { points };
}
