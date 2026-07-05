import { NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// POST /api/support/session
// Returns the investor's most recent active session, or creates a new one.
export async function POST() {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "investor") {
    return NextResponse.json({ error: "Investors only" }, { status: 403 });
  }

  const supabase = createServerClient();

  // Return the most recent session for this investor (creates if none)
  const { data: existing } = await supabase
    .from("ai_chat_sessions")
    .select("id, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ sessionId: existing.id });
  }

  const { data: created, error } = await supabase
    .from("ai_chat_sessions")
    .insert({ user_id: session.user.id })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessionId: created.id });
}
