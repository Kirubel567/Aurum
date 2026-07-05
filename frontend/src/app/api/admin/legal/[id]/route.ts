import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// PATCH /api/admin/legal/[id]
// Updates title, description, or doc_type of an existing document.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const body = await req.json() as {
    title?: string;
    description?: string;
    doc_type?: string;
  };

  const update: Record<string, string> = {};
  if (body.title?.trim())       update.title       = body.title.trim();
  if (body.description != null) update.description = body.description.trim();
  if (body.doc_type)            update.doc_type    = body.doc_type;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("legal_documents")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/legal/[id]
// Deletes the DB record and removes the file from Storage.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Fetch storage_path before deleting the row
  const { data: doc } = await supabase
    .from("legal_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { error } = await supabase
    .from("legal_documents")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort storage cleanup (don't fail the request if this errors)
  await supabase.storage.from("legal-documents").remove([doc.storage_path]);

  return NextResponse.json({ ok: true });
}
