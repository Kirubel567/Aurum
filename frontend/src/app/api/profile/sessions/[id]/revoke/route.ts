import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// PATCH /api/profile/sessions/[id]/revoke — mark a session as revoked
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  // Verify ownership before revoking
  const { data: row } = await supabase
    .from("active_sessions")
    .select("id, user_id, is_current")
    .eq("id", id)
    .single();

  if (!row) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (row.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (row.is_current) {
    return NextResponse.json({ error: "Cannot revoke current session" }, { status: 400 });
  }

  const { error } = await supabase
    .from("active_sessions")
    .update({ revoked: true })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
