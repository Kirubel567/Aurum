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

  let body: { suspend?: boolean } = {};
  try { body = await request.json() as typeof body; } catch { /* empty */ }

  if (typeof body.suspend !== "boolean") {
    return NextResponse.json({ error: "suspend (boolean) is required." }, { status: 400 });
  }

  const db = createServerClient();

  const { error } = await db
    .from("deposit_users")
    .update({ is_suspended: body.suspend })
    .eq("id", userId);

  if (error) {
    console.error("[terminate PATCH]", error.message);
    return NextResponse.json({ error: "Failed to update account status." }, { status: 500 });
  }

  if (body.suspend) {
    await insertNotification({
      userId,
      type:     "system_alert",
      title:    "Account Suspended",
      body:     "Your account has been suspended. Please contact support for assistance.",
      linkPath: "/support",
    });
  }

  return NextResponse.json({ success: true });
}
