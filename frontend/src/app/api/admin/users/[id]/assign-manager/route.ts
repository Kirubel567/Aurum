import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: investorId } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: super_admin only." }, { status: 401 });
  }

  let body: { managerId?: string | null } = {};
  try { body = await request.json() as typeof body; } catch { /* empty */ }

  const db = createServerClient();

  if (!body.managerId) {
    // Remove existing assignment
    const { error } = await db
      .from("account_manager_assignments")
      .delete()
      .eq("investor_id", investorId);
    if (error) {
      console.error("[assign-manager DELETE]", error.message);
      return NextResponse.json({ error: "Failed to remove assignment." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Verify the target is actually a staff member
  const { data: manager } = await db
    .from("deposit_users")
    .select("id, full_name, role")
    .eq("id", body.managerId)
    .single();

  if (!manager || manager.role === "investor") {
    return NextResponse.json({ error: "Target user is not a staff member." }, { status: 400 });
  }

  // Upsert — UNIQUE(investor_id) enforces one manager per investor; assigning
  // a different manager silently replaces the current one.
  const { error } = await db
    .from("account_manager_assignments")
    .upsert(
      {
        investor_id: investorId,
        admin_id:    body.managerId,
        assigned_by: session.user.id,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "investor_id" }
    );

  if (error) {
    console.error("[assign-manager PATCH]", error.message);
    return NextResponse.json({ error: "Failed to assign manager." }, { status: 500 });
  }

  // Notify investor
  await insertNotification({
    userId:   investorId,
    type:     "manager_assigned",
    title:    "Account Manager Assigned",
    body:     `${manager.full_name} has been assigned as your account manager.`,
    linkPath: "/profile",
  });

  // Notify the manager
  await insertNotification({
    userId:   body.managerId,
    type:     "manager_assigned",
    title:    "New Investor Assigned",
    body:     `You have been assigned a new investor account.`,
    linkPath: "/admin/users",
  });

  return NextResponse.json({ success: true });
}
