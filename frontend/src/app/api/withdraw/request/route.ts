import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

export async function POST(request: Request) {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let body: {
    amount?: number;
    bankAccountId?: string;
    method?: string;
    note?: string;
  } = {};
  try { body = await request.json() as typeof body; } catch { /* empty body */ }

  const amount = Number(body.amount ?? 0);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
  }
  if (!body.bankAccountId) {
    return NextResponse.json({ error: "A bank account ID is required." }, { status: 400 });
  }
  if (!["standard", "express"].includes(body.method ?? "")) {
    return NextResponse.json({ error: "method must be 'standard' or 'express'." }, { status: 400 });
  }

  const db     = createServerClient();
  const userId = session.user.id;

  // Release any matured trading-capital locks first so funds whose lock-up
  // has ended are withdrawable without waiting for a wallet-page visit.
  await db.rpc("release_matured_locks", { p_user_id: userId });

  // Call the RPC — it does all validation and locking
  const { data: withdrawalId, error: rpcErr } = await db.rpc("request_withdrawal", {
    p_user_id:         userId,
    p_amount_usd:      amount,
    p_bank_account_id: body.bankAccountId,
    p_method:          body.method ?? "standard",
    p_note:            body.note?.trim() || null,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    if (msg.includes("BELOW_MINIMUM_WITHDRAWAL"))     return NextResponse.json({ error: "Amount is below the minimum withdrawal limit.", code: "BELOW_MINIMUM" }, { status: 422 });
    if (msg.includes("INSUFFICIENT_AVAILABLE"))       return NextResponse.json({ error: "Amount exceeds your available balance.", code: "INSUFFICIENT_BALANCE" }, { status: 422 });
    if (msg.includes("DAILY_LIMIT"))                  return NextResponse.json({ error: "This request would exceed your daily withdrawal limit.", code: "DAILY_LIMIT" }, { status: 422 });
    if (msg.includes("MONTHLY_LIMIT"))                return NextResponse.json({ error: "This request would exceed your monthly withdrawal limit.", code: "MONTHLY_LIMIT" }, { status: 422 });
    console.error("[withdraw/request] RPC error:", msg);
    return NextResponse.json({ error: "Withdrawal request failed. Please try again." }, { status: 500 });
  }

  // Fetch the reference from the inserted row
  const { data: row } = await db
    .from("withdrawals")
    .select("reference")
    .eq("id", withdrawalId as string)
    .single();

  const reference = row?.reference ?? `WD-${Date.now()}`;

  // Non-critical: notify the investor + all staff
  const staffRows = await db
    .from("deposit_users")
    .select("id")
    .in("role", ["admin", "super_admin"]);

  await Promise.allSettled([
    insertNotification({
      userId: userId,
      type:   "withdrawal_status",
      title:  "Withdrawal request submitted",
      body:   `Your withdrawal request (${reference}) is under review.`,
      linkPath: "/withdraw",
    }),
    ...(staffRows.data ?? []).map((s) =>
      insertNotification({
        userId:   s.id as string,
        type:     "new_withdrawal",
        title:    "New withdrawal request",
        body:     `An investor submitted a withdrawal request (${reference}). Review in the admin portal.`,
        linkPath: "/admin/deposits",
      })
    ),
  ]);

  return NextResponse.json({ id: withdrawalId, reference }, { status: 201 });
}
