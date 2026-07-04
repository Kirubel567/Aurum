import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// PATCH /api/notifications/read-all — the dropdown's "mark all as read".
export async function PATCH() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();
    const { error } = await db
      .from("notifications")
      .update({ read: true })
      .eq("user_id", session.user.id)
      .eq("read", false);

    if (error) {
      console.error("[notifications] read-all failed:", error.message);
      return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications] read-all crashed:", error);
    return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
  }
}
