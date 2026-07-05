import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roleFilter   = searchParams.get("role");   // "investor" | "admin" | null (all)
  const statusFilter = searchParams.get("status");  // "approved" | "pending" | "suspended" | null

  const db = createServerClient();

  let query = db
    .from("deposit_users")
    .select(`
      id, full_name, email, role, deposit_status, is_suspended, created_at, updated_at,
      account_manager_assignments!account_manager_assignments_investor_id_fkey (
        admin_id,
        deposit_users!account_manager_assignments_admin_id_fkey ( id, full_name )
      )
    `)
    .order("created_at", { ascending: false });

  if (roleFilter === "investor") {
    query = query.eq("role", "investor");
  } else if (roleFilter === "admin") {
    query = query.in("role", ["admin", "super_admin"]);
  }

  const { data, error } = await query;

  // Fetch balances separately (cleaner than a PostgREST array join)
  const { data: wallets } = await db
    .from("wallets")
    .select("user_id, balance")
    .eq("currency", "USD");
  const balanceMap: Record<string, number> = {};
  for (const w of wallets ?? []) {
    balanceMap[w.user_id] = Number(w.balance);
  }

  if (error) {
    console.error("[admin/users GET]", error.message);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }

  // For admin-role rows: pull investor_count from account_manager_assignments
  let managerCounts: Record<string, number> = {};
  if (!roleFilter || roleFilter === "admin") {
    const { data: counts } = await db
      .from("account_manager_assignments")
      .select("admin_id");
    if (counts) {
      for (const row of counts) {
        managerCounts[row.admin_id] = (managerCounts[row.admin_id] ?? 0) + 1;
      }
    }
  }

  const users = (data ?? []).map((u) => {
    const balance: number = balanceMap[u.id] ?? 0;
    const assignment = (u.account_manager_assignments as unknown as Array<{
      admin_id: string;
      deposit_users: { id: string; full_name: string } | null;
    }> | null)?.[0];

    const nameParts = (u.full_name ?? "").split(" ").filter(Boolean);
    const initials = nameParts.slice(0, 2).map((p: string) => p[0]?.toUpperCase() ?? "").join("");

    const isSuspended: boolean = (u as unknown as { is_suspended: boolean }).is_suspended ?? false;
    let uiStatus: "Verified" | "Pending" | "Suspended" = "Pending";
    if (isSuspended) uiStatus = "Suspended";
    else if (u.deposit_status === "approved") uiStatus = "Verified";

    let tier: "Tier 1 - Retail" | "Tier 2 - Pro" | "Tier 3 - Institutional" = "Tier 1 - Retail";
    if (balance >= 100_000) tier = "Tier 3 - Institutional";
    else if (balance >= 10_000) tier = "Tier 2 - Pro";

    // Last active: use updated_at
    const updatedMs = u.updated_at ? new Date(u.updated_at).getTime() : 0;
    const diffMin   = Math.floor((Date.now() - updatedMs) / 60000);
    let lastActive  = "a while ago";
    if (diffMin < 1)   lastActive = "just now";
    else if (diffMin < 60) lastActive = `${diffMin} min ago`;
    else if (diffMin < 1440) lastActive = `${Math.floor(diffMin / 60)} hr ago`;
    else lastActive = `${Math.floor(diffMin / 1440)} days ago`;

    const investorCount = managerCounts[u.id] ?? 0;

    return {
      id: u.id,
      uid: u.id.slice(0, 8).toUpperCase(),
      name: u.full_name ?? u.email,
      email: u.email,
      initials,
      role: u.role,
      depositStatus: u.deposit_status,
      isSuspended,
      status: uiStatus,
      tier,
      volume: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(balance),
      balanceRaw: balance,
      lastActive,
      assignedManagerId: assignment?.admin_id ?? null,
      assignedManagerName: assignment?.deposit_users?.full_name ?? null,
      // For manager roster view
      investorCount,
      maxCapacity: 15,
      specialization: u.role !== "investor" ? "Account Manager" : null,
    };
  });

  // Apply UI status filter after mapping
  const filtered = statusFilter
    ? users.filter((u) => {
        if (statusFilter === "suspended") return u.isSuspended;
        if (statusFilter === "approved")  return u.depositStatus === "approved" && !u.isSuspended;
        if (statusFilter === "pending")   return u.depositStatus !== "approved" && !u.isSuspended;
        return true;
      })
    : users;

  return NextResponse.json({ users: filtered });
}
