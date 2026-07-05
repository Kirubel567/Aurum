import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// GET /api/legal/documents/[id]/download
// Generates a signed URL (1-hour expiry) for the document's Storage file.
export async function GET(
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

  // Verify ownership
  const { data: doc, error: docError } = await supabase
    .from("legal_documents")
    .select("storage_path, assigned_to")
    .eq("id", id)
    .maybeSingle();

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.assigned_to !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate signed URL (expires in 1 hour)
  const { data: signed, error: signError } = await supabase.storage
    .from("legal-documents")
    .createSignedUrl(doc.storage_path, 3600);

  if (signError) return NextResponse.json({ error: signError.message }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
