import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export interface ActivityEvent {
  id: string;
  kind: "registration" | "deposit_submitted" | "message";
  title: string;
  detail: string;
  at: string; // ISO timestamp
  linkPath: string;
}

// GET /api/admin/activity — recent real platform activity for the top-bar
// History dropdown: new registrations, deposit proof submissions, and
// investor messages, merged newest-first. Staff only. (A proper audit_log
// feed replaces this when Section C's audit_log ships with the money phases.)
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();

    const [users, proofs, messages] = await Promise.all([
      db
        .from("deposit_users")
        .select("id, full_name, email, created_at")
        .eq("role", "investor")
        .order("created_at", { ascending: false })
        .limit(10),
      db
        .from("deposit_users")
        .select("id, full_name, intended_deposit_amount, updated_at")
        .eq("deposit_status", "pending")
        .not("proof_file_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(10),
      db
        .from("messages")
        .select("id, investor_name, body, created_at")
        .eq("sender_role", "investor")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const events: ActivityEvent[] = [
      ...(users.data ?? []).map((u) => ({
        id: `reg-${u.id}`,
        kind: "registration" as const,
        title: "New investor registered",
        detail: `${u.full_name} (${u.email})`,
        at: u.created_at,
        linkPath: "/admin/users",
      })),
      ...(proofs.data ?? []).map((u) => ({
        id: `dep-${u.id}`,
        kind: "deposit_submitted" as const,
        title: "Deposit proof awaiting review",
        detail: `${u.full_name}${u.intended_deposit_amount ? ` — $${Number(u.intended_deposit_amount).toLocaleString()}` : ""}`,
        at: u.updated_at,
        linkPath: "/admin/deposits",
      })),
      ...(messages.data ?? []).map((m) => ({
        id: `msg-${m.id}`,
        kind: "message" as const,
        title: `Message from ${m.investor_name || "investor"}`,
        detail: (m.body ?? "").slice(0, 80),
        at: m.created_at,
        linkPath: "/admin/inbox",
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 15);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("[admin-activity] crashed:", error);
    return NextResponse.json({ error: "Failed to load activity." }, { status: 500 });
  }
}
