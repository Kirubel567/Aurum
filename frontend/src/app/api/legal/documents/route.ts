import { NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// GET /api/legal/documents
// Returns all legal documents assigned to the current investor.
export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "investor") {
    return NextResponse.json({ error: "Investors only" }, { status: 403 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("legal_documents")
    .select("id, title, doc_type, description, storage_path, is_read, read_at, created_at")
    .eq("assigned_to", session.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ documents: data ?? [] });
}
