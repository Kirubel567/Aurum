import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// PATCH /api/legal/documents/[id]/read
// Marks a document as read by the current investor.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "investor") {
    return NextResponse.json({ error: "Investors only" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Verify ownership and only update if not already read (idempotent)
  const { data: doc } = await supabase
    .from("legal_documents")
    .select("id, assigned_to, is_read")
    .eq("id", id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.assigned_to !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (doc.is_read) return NextResponse.json({ ok: true }); // already read

  const { error } = await supabase
    .from("legal_documents")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
