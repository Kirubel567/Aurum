import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// GET /api/support/session/[id]/messages
// Returns full message history for a session — used to restore chat on page load.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  // Verify the session belongs to this user
  const { data: chatSession } = await supabase
    .from("ai_chat_sessions")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!chatSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (chatSession.user_id !== session.user.id && session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("ai_chat_messages")
    .select("id, role, body, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data ?? [] });
}
