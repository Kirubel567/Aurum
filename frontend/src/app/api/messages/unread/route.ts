import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/src/lib/supabase/server";
import { SESSION_COOKIE } from "@/src/features/onboarding/lib/deposit-cookies";
import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";

// GET /api/messages/unread — lightweight unread count for the notification bell
export async function GET() {
  try {
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value ?? null;
    if (!raw) return NextResponse.json({ count: 0 });
    const session = JSON.parse(raw) as DepositSession;
    if (!session?.user) return NextResponse.json({ count: 0 });

    const supabase = createServerClient();

    if (session.user.role === "admin") {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("read_by_admin", false)
        .eq("sender_role", "investor");
      return NextResponse.json({ count: count ?? 0 });
    }

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("investor_id", session.user.id)
      .eq("read_by_investor", false)
      .eq("sender_role", "admin");
    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
