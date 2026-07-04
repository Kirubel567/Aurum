import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// GET /api/admin/assignments — staff can list all assignments; an `admin`
// gets their own roster filtered server-side for the console's investor
// picker (they should never see the full list to pick from).
export async function GET(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mineOnly = request.nextUrl.searchParams.get("mine") === "true";
    const db = createServerClient();
    let query = db
      .from("account_manager_assignments")
      .select("id, investor_id, admin_id, assigned_at, deposit_users!account_manager_assignments_investor_id_fkey(full_name, email)")
      .order("assigned_at", { ascending: false });

    if (mineOnly || session.user.role === "admin") {
      query = query.eq("admin_id", session.user.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[assignments] list failed:", error.message);
      return NextResponse.json({ error: "Failed to load assignments." }, { status: 500 });
    }

    return NextResponse.json({
      assignments: (data ?? []).map((row) => ({
        id: row.id,
        investorId: row.investor_id,
        adminId: row.admin_id,
        investorName: (row as { deposit_users?: { full_name?: string } }).deposit_users?.full_name ?? "Unknown",
        investorEmail: (row as { deposit_users?: { email?: string } }).deposit_users?.email ?? "",
        assignedAt: row.assigned_at,
      })),
    });
  } catch (error) {
    console.error("[assignments] crashed:", error);
    return NextResponse.json({ error: "Failed to load assignments." }, { status: 500 });
  }
}

// POST /api/admin/assignments — super_admin only. Upserts (one active
// manager per investor — UNIQUE(investor_id) means this replaces any prior
// assignment for that investor).
export async function POST(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Only the Platform Controller can assign account managers." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const investorId = String(body.investorId ?? "");
    const adminId = String(body.adminId ?? "");
    if (!investorId || !adminId) {
      return NextResponse.json({ error: "investorId and adminId are required." }, { status: 400 });
    }

    const db = createServerClient();
    const [{ data: investor }, { data: admin }] = await Promise.all([
      db.from("deposit_users").select("id").eq("id", investorId).eq("role", "investor").maybeSingle(),
      db.from("deposit_users").select("id").eq("id", adminId).in("role", ["admin", "super_admin"]).maybeSingle(),
    ]);
    if (!investor) return NextResponse.json({ error: "Investor not found." }, { status: 404 });
    if (!admin) return NextResponse.json({ error: "Admin account not found." }, { status: 404 });

    const { error } = await db
      .from("account_manager_assignments")
      .upsert(
        { investor_id: investorId, admin_id: adminId, assigned_by: session.user.id, assigned_at: new Date().toISOString() },
        { onConflict: "investor_id" }
      );
    if (error) {
      console.error("[assignments] upsert failed:", error.message);
      return NextResponse.json({ error: "Failed to assign." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[assignments] crashed:", error);
    return NextResponse.json({ error: "Failed to assign." }, { status: 500 });
  }
}

// DELETE /api/admin/assignments?investorId=... — super_admin only.
export async function DELETE(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Only the Platform Controller can remove account manager assignments." }, { status: 403 });
    }
    const investorId = request.nextUrl.searchParams.get("investorId");
    if (!investorId) {
      return NextResponse.json({ error: "investorId query param is required." }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db.from("account_manager_assignments").delete().eq("investor_id", investorId);
    if (error) {
      console.error("[assignments] delete failed:", error.message);
      return NextResponse.json({ error: "Failed to remove assignment." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[assignments] crashed:", error);
    return NextResponse.json({ error: "Failed to remove assignment." }, { status: 500 });
  }
}
