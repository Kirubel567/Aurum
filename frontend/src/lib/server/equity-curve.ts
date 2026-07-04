import { createServerClient } from "@/src/lib/supabase/server";

export type CurvePeriod = "day" | "week" | "month" | "year";

const PERIODS: Record<CurvePeriod, { windowMs: number; buckets: number }> = {
  day: { windowMs: 24 * 3600_000, buckets: 24 },   // hourly
  week: { windowMs: 7 * 86400_000, buckets: 7 },    // daily
  month: { windowMs: 30 * 86400_000, buckets: 30 }, // daily
  year: { windowMs: 365 * 86400_000, buckets: 12 }, // monthly
};

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
  drawdown: number; // running peak equity
}

// Running-sum equity over a user's ledger entries, bucketed for the window.
// Shared by /api/dashboard/equity-curve and /api/orders/live.
export async function buildEquityCurve(
  userId: string,
  period: CurvePeriod
): Promise<{ points: CurvePoint[]; changePercent: number }> {
  const db = createServerClient();
  const { data: entries, error } = await db
    .from("ledger_entries")
    .select("amount, created_at")
    .eq("account_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`[equity-curve] ${error.message}`);

  const { windowMs, buckets } = PERIODS[period];
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucketSize = windowMs / buckets;

  let equity = 0;
  const inWindow: { at: number; amount: number }[] = [];
  for (const row of entries ?? []) {
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
    return {
      date: labelFor(new Date(bucketEnd), period),
      equity: Number(equity.toFixed(2)),
      drawdown: Number(peak.toFixed(2)),
    };
  });

  const first = points[0]?.equity ?? 0;
  const last = points[points.length - 1]?.equity ?? 0;
  const changePercent = first > 0 ? Number((((last - first) / first) * 100).toFixed(2)) : 0;

  return { points, changePercent };
}
