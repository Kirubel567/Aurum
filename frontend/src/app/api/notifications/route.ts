import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// GET /api/notifications — the caller's unread count + latest 10 rows.
// Backs the nav-bar bell; polled by React Query on the shells.
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();

    const [{ count }, { data: latest, error }] = await Promise.all([
      db
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("read", false),
      db
        .from("notifications")
        .select("id, type, title, body, link_path, read, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (error) {
      console.error("[notifications] list failed:", error.message);
      return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
    }

    return NextResponse.json({
      unreadCount: count ?? 0,
      notifications: latest ?? [],
    });
  } catch (error) {
    console.error("[notifications] unexpected failure:", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}
