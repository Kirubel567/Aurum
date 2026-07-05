import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const userId = session.user.id;
  const db     = createServerClient();

  const [walletRes, settingsRes, withdrawalsRes] = await Promise.all([
    db.from("wallets").select("balance, locked_principal").eq("user_id", userId).single(),
    db.from("system_settings").select(
      "min_withdrawal_usd, standard_fee_rate, express_fee_rate, withdrawal_daily_limit, withdrawal_monthly_limit"
    ).single(),
    db.from("withdrawals")
      .select("amount_usd, net_usd, status, created_at")
      .eq("user_id", userId),
  ]);

  const wallet   = walletRes.data;
  const settings = settingsRes.data;
  const wds      = withdrawalsRes.data ?? [];

  const balance        = Number(wallet?.balance ?? 0);
  const lockedPrincipal = Number(wallet?.locked_principal ?? 0);
  const pendingSum     = wds.filter((w) => w.status === "pending")
    .reduce((s, w) => s + Number(w.amount_usd), 0);
  const availableToWithdraw = Math.max(0, balance - lockedPrincipal - pendingSum);
  const totalWithdrawn  = wds.filter((w) => w.status === "approved")
    .reduce((s, w) => s + Number(w.net_usd), 0);

  const now   = new Date();
  const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()).toISOString();
  const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString();

  const dailyUsed = wds
    .filter((w) => ["pending", "approved"].includes(w.status) && w.created_at >= today)
    .reduce((s, w) => s + Number(w.amount_usd), 0);

  const withdrawnThisMonth = wds
    .filter((w) => ["pending", "approved"].includes(w.status) && w.created_at >= monthStart)
    .reduce((s, w) => s + Number(w.amount_usd), 0);

  return NextResponse.json({
    totalBalance:        balance,
    availableToWithdraw,
    pendingWithdrawals:  pendingSum,
    totalWithdrawn,
    lockedPrincipal,
    dailyUsed,
    dailyLimit:          Number(settings?.withdrawal_daily_limit   ?? 10_000),
    withdrawnThisMonth,
    monthlyLimit:        Number(settings?.withdrawal_monthly_limit ?? 50_000),
    minWithdrawal:       Number(settings?.min_withdrawal_usd       ?? 500),
    standardFeeRate:     Number(settings?.standard_fee_rate        ?? 0.005),
    expressFeeRate:      Number(settings?.express_fee_rate         ?? 0.01),
  });
}
