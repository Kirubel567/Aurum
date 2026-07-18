import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: super_admin only." }, { status: 401 });
  }

  let body: { amount?: number; reason?: string } = {};
  try { body = await request.json() as typeof body; } catch { /* empty */ }

  if (typeof body.amount !== "number" || !isFinite(body.amount) || body.amount === 0) {
    return NextResponse.json({ error: "A non-zero numeric amount is required." }, { status: 400 });
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  const db = createServerClient();

  const { error } = await db.rpc("admin_adjust_balance", {
    p_user_id:      userId,
    p_amount:       body.amount,
    p_reason:       body.reason.trim(),
    p_performed_by: session.user.id,
  });

  if (error) {
    console.error("[balance PATCH]", error.message);
    const msg = error.message.includes("negative balance")
      ? "Adjustment would result in a negative balance."
      : error.message.includes("super_admin")
      ? "Forbidden."
      : "Balance adjustment failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Notify investor
  const sign = body.amount > 0 ? "+" : "";
  const fmt  = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(body.amount);
  await insertNotification({
    userId,
    type:     "system_alert",
    title:    "Balance Adjusted",
    body:     `Your account balance was adjusted by ${sign}${fmt}.`,
    linkPath: "/wallet",
  });

  return NextResponse.json({ success: true });
}
