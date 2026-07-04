import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// PATCH /api/notifications/[id]/read — mark one of the caller's
// notifications read (clicked in the bell dropdown).
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const db = createServerClient();
    // user_id filter makes it impossible to mark someone else's row read,
    // even with a guessed id.
    const { error } = await db
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("[notifications] mark-read failed:", error.message);
      return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications] mark-read crashed:", error);
    return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
  }
}
