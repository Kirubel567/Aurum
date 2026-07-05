import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: super_admin only." }, { status: 401 });
  }

  let body: { reason?: string } = {};
  try { body = await request.json() as { reason?: string }; } catch { /* empty */ }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }

  const db = createServerClient();

  const { data: withdrawal } = await db
    .from("withdrawals")
    .select("status, user_id, reference, amount_usd")
    .eq("id", id)
    .single();

  if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found." }, { status: 404 });
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: `Withdrawal is already ${withdrawal.status}.` }, { status: 409 });
  }

  const { error: rpcErr } = await db.rpc("reject_withdrawal", {
    p_withdrawal_id: id,
    p_reviewed_by:   session.user.id,
    p_reason:        body.reason.trim(),
  });

  if (rpcErr) {
    console.error("[admin/withdrawals/reject] RPC error:", rpcErr.message);
    return NextResponse.json({ error: "Rejection failed. Please try again." }, { status: 500 });
  }

  await Promise.allSettled([
    insertNotification({
      userId:   withdrawal.user_id as string,
      type:     "withdrawal_status",
      title:    "Withdrawal request rejected",
      body:     `Your withdrawal request (${withdrawal.reference}) was not approved. Reason: ${body.reason.trim()}`,
      linkPath: "/withdraw",
    }),
  ]);

  await db.from("audit_log").insert({
    actor_id:     session.user.id,
    actor_role:   session.user.role,
    action:       "withdrawal_rejected",
    target_table: "withdrawals",
    target_id:    id,
    metadata:     { reason: body.reason.trim(), reference: withdrawal.reference },
  });

  return NextResponse.json({ success: true });
}
