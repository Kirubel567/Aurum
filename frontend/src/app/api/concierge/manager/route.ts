import { NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// GET /api/concierge/manager
// Returns the account manager assigned to the current investor.
// Returns { manager: null } if no assignment exists.
export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session?.user || session.user.role !== "investor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerClient();

  const { data: assignment } = await db
    .from("account_manager_assignments")
    .select("admin_id")
    .eq("investor_id", session.user.id)
    .maybeSingle();

  if (!assignment?.admin_id) {
    return NextResponse.json({ manager: null });
  }

  const { data: manager } = await db
    .from("deposit_users")
    .select("id, full_name, email, phone_number")
    .eq("id", assignment.admin_id)
    .maybeSingle();

  if (!manager) {
    return NextResponse.json({ manager: null });
  }

  return NextResponse.json({
    manager: {
      id: manager.id,
      name: manager.full_name ?? "Your Account Manager",
      email: manager.email ?? null,
      phone: (manager as unknown as { phone_number?: string }).phone_number ?? null,
    },
  });
}
