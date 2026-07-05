import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const userId = session.user.id;
  const db = createServerClient();

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [walletRes, depositsRes, withdrawalsRes, userRes] = await Promise.all([
    db.from("wallets").select("balance, locked_principal").eq("user_id", userId).single(),

    db
      .from("deposits")
      .select("settled_amount_usd, reviewed_at, status, amount_submitted, currency_submitted, method, tx_reference")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),

    db
      .from("withdrawals")
      .select("amount_usd, net_usd, fee_usd, status, reviewed_at, created_at")
      .eq("user_id", userId),

    db.from("deposit_users").select("full_name, username, deposit_status").eq("id", userId).single(),
  ]);

  const wallet      = walletRes.data;
  const deposits    = depositsRes.data ?? [];
  const withdrawals = withdrawalsRes.data ?? [];
  const user        = userRes.data;

  const balance        = Number(wallet?.balance ?? 0);
  const lockedPrincipal = Number(wallet?.locked_principal ?? 0);

  const approvedDeposits = deposits.filter((d) => d.status === "approved");
  const totalDeposited   = approvedDeposits.reduce((s, d) => s + Number(d.settled_amount_usd ?? 0), 0);

  const approvedWithdrawals = withdrawals.filter((w) => w.status === "approved");
  const totalWithdrawn      = approvedWithdrawals.reduce((s, w) => s + Number(w.net_usd ?? 0), 0);

  const pendingWithdrawals = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + Number(w.amount_usd ?? 0), 0);

  const availableBalance = Math.max(0, balance - pendingWithdrawals);

  // First approved deposit date = "Activated On"
  const firstApproved  = approvedDeposits[0];
  const activatedOn    = firstApproved?.reviewed_at ?? null;

  // Wallet ID — short human-readable handle derived from user id
  const walletId = "WLT-" + userId.replace(/-/g, "").slice(-6).toUpperCase();

  // Latest deposit metadata for the "Deposit Details" modal
  const latestDeposit = [...approvedDeposits].sort(
    (a, b) => new Date(b.reviewed_at ?? 0).getTime() - new Date(a.reviewed_at ?? 0).getTime()
  )[0] ?? null;

  return NextResponse.json({
    balance,
    lockedPrincipal,
    availableBalance,
    totalDeposited,
    totalWithdrawn,
    pendingWithdrawals,
    walletId,
    activatedOn,
    currency: "USD",
    accountType:  "Standard Investor",
    kycLevel:     "Level 2 — Verified",
    dailyLimit:   10_000,
    monthlyLimit: 50_000,
    withdrawalMethod: "Bank Transfer",
    status: user?.deposit_status === "approved" ? "active" : (user?.deposit_status ?? "inactive"),
    latestDeposit: latestDeposit
      ? {
          settledAmountUsd:    Number(latestDeposit.settled_amount_usd ?? 0),
          amountSubmitted:     Number(latestDeposit.amount_submitted ?? 0),
          currencySubmitted:   latestDeposit.currency_submitted,
          method:              latestDeposit.method,
          txReference:         latestDeposit.tx_reference,
          date:                latestDeposit.reviewed_at,
        }
      : null,
  });
}
