import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// GET /api/admin/legal
// Lists all legal documents with assignee info.
export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("legal_documents")
    .select(`
      id, title, doc_type, description, storage_path,
      is_read, read_at, created_at,
      assigned_to,
      assignee:deposit_users!legal_documents_assigned_to_fkey(id, full_name, email),
      uploader:deposit_users!legal_documents_uploaded_by_fkey(id, full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ documents: data ?? [] });
}

// POST /api/admin/legal
// Uploads a PDF to the legal-documents bucket and creates the DB record.
// Accepts multipart/form-data: file, title, doc_type, description, assigned_to (user id)
export async function POST(req: NextRequest) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();

  const form = await req.formData();
  const file        = form.get("file") as File | null;
  const title       = (form.get("title") as string | null)?.trim();
  const doc_type    = form.get("doc_type") as string | null;
  const description = (form.get("description") as string | null)?.trim() ?? "";
  const assigned_to = form.get("assigned_to") as string | null;

  if (!file || !title || !doc_type || !assigned_to) {
    return NextResponse.json(
      { error: "file, title, doc_type, and assigned_to are required" },
      { status: 400 }
    );
  }

  const VALID_TYPES = ["agreement", "contract", "bank", "legal"];
  if (!VALID_TYPES.includes(doc_type)) {
    return NextResponse.json({ error: "Invalid doc_type" }, { status: 400 });
  }

  // Verify assignee exists
  const { data: assignee } = await supabase
    .from("deposit_users")
    .select("id")
    .eq("id", assigned_to)
    .maybeSingle();
  if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });

  // Build storage path: assigned_to/timestamp-slugged-title.ext
  const ext = file.name.split(".").pop() ?? "pdf";
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const storagePath = `${assigned_to}/${Date.now()}-${slug}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("legal-documents")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Insert DB record
  const { data: doc, error: insertError } = await supabase
    .from("legal_documents")
    .insert({
      title,
      doc_type,
      description,
      storage_path: storagePath,
      assigned_to,
      uploaded_by: session.user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    // Clean up orphaned storage file
    await supabase.storage.from("legal-documents").remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Notify investor
  await supabase.from("notifications").insert({
    user_id: assigned_to,
    type: "document_assigned",
    title: "New document available",
    body: `"${title}" has been added to your My Contract section.`,
    read: false,
  });

  return NextResponse.json({ id: doc.id }, { status: 201 });
}
