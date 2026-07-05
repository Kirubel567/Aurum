import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export interface AuditLogEntry {
  id: string;
  userName: string;
  role: string;
  deviceLabel: string;
  ipAddress: string | null;
  at: string;
}

// GET /api/admin/settings/audit-log — recent staff login sessions from
// active_sessions, the platform's real access trail. Staff only.
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();

    // Staff user ids first, then their sessions (no FK-join dependency).
    const { data: staff, error: staffError } = await db
      .from("deposit_users")
      .select("id, full_name, role")
      .neq("role", "investor");

    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });

    const staffById = new Map(
      (staff ?? []).map((s) => [String(s.id), { name: s.full_name ?? "Staff", role: String(s.role) }])
    );

    if (staffById.size === 0) return NextResponse.json({ entries: [] });

    const { data: sessions, error: sessionsError } = await db
      .from("active_sessions")
      .select("id, user_id, device_label, ip_address, created_at")
      .in("user_id", [...staffById.keys()])
      .order("created_at", { ascending: false })
      .limit(20);

    if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 });

    const entries: AuditLogEntry[] = (sessions ?? []).map((s) => {
      const staffInfo = staffById.get(String(s.user_id));
      return {
        id: s.id,
        userName: staffInfo?.name ?? "Staff",
        role: staffInfo?.role ?? "admin",
        deviceLabel: s.device_label,
        ipAddress: s.ip_address,
        at: s.created_at,
      };
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[admin-audit-log] crashed:", error);
    return NextResponse.json({ error: "Failed to load audit log." }, { status: 500 });
  }
}
