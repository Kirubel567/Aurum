import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/src/lib/supabase/server";
import { SESSION_COOKIE } from "@/src/features/onboarding/lib/deposit-cookies";
import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";

async function getSession(): Promise<DepositSession | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value ?? null;
    if (!raw) return null;
    return JSON.parse(raw) as DepositSession;
  } catch {
    return null;
  }
}

// GET /api/messages — fetch thread for current investor (or all threads if admin)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);

  try {
    if (session.user.role === "admin") {
      // Admin: get distinct investor threads with latest message preview
      const investorId = searchParams.get("investor_id");
      if (investorId) {
        // Full thread for a specific investor
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("investor_id", investorId)
          .order("created_at", { ascending: true });
        if (error) throw error;

        // Mark admin-unread messages as read
        await supabase
          .from("messages")
          .update({ read_by_admin: true })
          .eq("investor_id", investorId)
          .eq("read_by_admin", false);

        return NextResponse.json({ messages: data });
      }

      // Thread list — latest message per investor
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by investor_id, keep latest
      const seen = new Map<string, typeof data[0]>();
      for (const msg of data ?? []) {
        if (!seen.has(msg.investor_id)) seen.set(msg.investor_id, msg);
      }
      const threads = [...seen.values()].map((msg) => ({
        investor_id: msg.investor_id,
        investor_name: msg.investor_name,
        last_message: msg.body,
        last_at: msg.created_at,
        unread: data?.filter(
          (m) => m.investor_id === msg.investor_id && !m.read_by_admin && m.sender_role === "investor"
        ).length ?? 0,
      }));

      return NextResponse.json({ threads });
    }

    // Investor: fetch own thread
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("investor_id", session.user.id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Mark investor-unread messages as read
    await supabase
      .from("messages")
      .update({ read_by_investor: true })
      .eq("investor_id", session.user.id)
      .eq("read_by_investor", false)
      .eq("sender_role", "admin");

    return NextResponse.json({ messages: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, investor_id } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const supabase = createServerClient();

  try {
    const isAdmin = session.user.role === "admin";
    const targetInvestorId = isAdmin ? investor_id : session.user.id;
    if (!targetInvestorId) return NextResponse.json({ error: "Missing investor_id" }, { status: 400 });

    const { data, error } = await supabase
      .from("messages")
      .insert({
        investor_id: targetInvestorId,
        investor_name: isAdmin ? (investor_id ?? "") : (session.user.fullName ?? session.user.email ?? "Investor"),
        sender_role: isAdmin ? "admin" : "investor",
        body: body.trim(),
        read_by_investor: isAdmin ? false : true,
        read_by_admin: isAdmin ? true : false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ message: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
