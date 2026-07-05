import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { sendInvestorRejectionEmail } from "@/src/features/onboarding/lib/email";
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
  try {
    body = await request.json() as { reason?: string };
  } catch { /* no body — will be caught below */ }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }

  const db = createServerClient();

  // Quick pre-check to surface friendly errors before calling the RPC
  const { data: deposit } = await db
    .from("deposits")
    .select("status, user_id")
    .eq("id", id)
    .single();

  if (!deposit) {
    return NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  }
  if (deposit.status !== "pending") {
    return NextResponse.json({ error: `Deposit is already ${deposit.status}.` }, { status: 409 });
  }

  const { error: rpcErr } = await db.rpc("reject_deposit", {
    p_deposit_id:  id,
    p_reviewed_by: session.user.id,
    p_reason:      body.reason.trim(),
  });

  if (rpcErr) {
    console.error("[admin/deposits/reject] RPC error:", rpcErr.message);
    return NextResponse.json({ error: "Rejection failed. Please try again." }, { status: 500 });
  }

  // Non-critical side-effects
  const { data: investor } = await db
    .from("deposit_users")
    .select("email, full_name")
    .eq("id", deposit.user_id)
    .single();

  if (investor) {
    await Promise.allSettled([
      sendInvestorRejectionEmail(investor.email, investor.full_name ?? "Investor"),
      insertNotification({
        userId:   deposit.user_id as string,
        type:     "deposit_status",
        title:    "Deposit proof rejected",
        body:     "Your deposit proof could not be verified. Please resubmit a clear, legible receipt.",
        linkPath: "/funding/upload",
      }),
    ]);
  }

  // Audit log
  await db.from("audit_log").insert({
    actor_id:     session.user.id,
    actor_role:   session.user.role,
    action:       "deposit_rejected",
    target_table: "deposits",
    target_id:    id,
    metadata:     { reason: body.reason.trim() },
  });

  return NextResponse.json({ success: true });
}
