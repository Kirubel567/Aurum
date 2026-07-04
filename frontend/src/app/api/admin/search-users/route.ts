import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// GET /api/admin/search-users?q=... — live results for the admin top-bar
// search. Staff only. Matches name/email/username, newest accounts first.
export async function GET(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Escape the LIKE wildcards so a query like "100%" behaves literally.
    const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);

    const db = createServerClient();
    const { data, error } = await db
      .from("deposit_users")
      .select("id, full_name, email, role, deposit_status, created_at")
      .or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,username.ilike.%${escaped}%`)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("[search-users] failed:", error.message);
      return NextResponse.json({ error: "Search failed." }, { status: 500 });
    }

    return NextResponse.json({
      results: (data ?? []).map((row) => ({
        id: row.id,
        name: row.full_name,
        email: row.email,
        role: row.role,
        depositStatus: row.deposit_status,
      })),
    });
  } catch (error) {
    console.error("[search-users] crashed:", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
