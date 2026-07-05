import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: super_admin only." }, { status: 401 });
  }

  const db = createServerClient();

  // Pre-check before calling RPC (nicer error messages)
  const { data: withdrawal } = await db
    .from("withdrawals")
    .select("status, user_id, reference, amount_usd")
    .eq("id", id)
    .single();

  if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found." }, { status: 404 });
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: `Withdrawal is already ${withdrawal.status}.` }, { status: 409 });
  }

  const { error: rpcErr } = await db.rpc("approve_withdrawal", {
    p_withdrawal_id: id,
    p_reviewed_by:   session.user.id,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    if (msg.includes("INSUFFICIENT_BALANCE_AT_APPROVAL")) {
      return NextResponse.json({ error: "Investor balance is insufficient at approval time." }, { status: 422 });
    }
    console.error("[admin/withdrawals/approve] RPC error:", msg);
    return NextResponse.json({ error: "Approval failed. Please try again." }, { status: 500 });
  }

  // Notify investor
  const { data: investor } = await db
    .from("deposit_users")
    .select("email, full_name")
    .eq("id", withdrawal.user_id)
    .single();

  await Promise.allSettled([
    insertNotification({
      userId:   withdrawal.user_id as string,
      type:     "withdrawal_status",
      title:    "Withdrawal approved",
      body:     `Your withdrawal request (${withdrawal.reference}) has been approved. Funds will be transferred within 1–3 business days.`,
      linkPath: "/withdraw",
    }),
  ]);

  // Audit log
  await db.from("audit_log").insert({
    actor_id:     session.user.id,
    actor_role:   session.user.role,
    action:       "withdrawal_approved",
    target_table: "withdrawals",
    target_id:    id,
    metadata:     { reference: withdrawal.reference, amount_usd: withdrawal.amount_usd, investor_email: investor?.email },
  });

  return NextResponse.json({ success: true });
}
