import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

// PATCH /api/admin/users/[id]/role — promote an investor to admin (or demote
// an admin back to investor). super_admin only. Never touches super_admin
// accounts and never grants super_admin through this route.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: super_admin only." }, { status: 401 });
  }

  let body: { role?: string } = {};
  try { body = await request.json() as typeof body; } catch { /* empty */ }

  const target = body.role === "admin" ? "admin" : body.role === "investor" ? "investor" : null;
  if (!target) {
    return NextResponse.json({ error: "role must be 'admin' or 'investor'." }, { status: 400 });
  }

  const db = createServerClient();

  const { data: user } = await db
    .from("deposit_users")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (user.role === "super_admin") {
    return NextResponse.json({ error: "Cannot change a super admin's role." }, { status: 403 });
  }
  if (user.role === target) {
    return NextResponse.json({ error: `User is already ${target}.` }, { status: 409 });
  }

  // Promoting an investor to admin also clears the deposit gate so they can
  // reach staff areas immediately.
  const update: Record<string, string> = { role: target };
  if (target === "admin") update.deposit_status = "approved";

  const { error } = await db.from("deposit_users").update(update).eq("id", userId);
  if (error) {
    console.error("[users/role PATCH]", error.message);
    return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
  }

  await insertNotification({
    userId,
    type:     "system_alert",
    title:    target === "admin" ? "Promoted to Admin" : "Role Changed",
    body:     target === "admin"
      ? "Your account has been promoted to an administrator role."
      : "Your account role has been changed to investor.",
    linkPath: "/dashboard",
  });

  return NextResponse.json({ success: true, role: target });
}
