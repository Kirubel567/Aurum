import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// POST /api/profile/avatar — upload profile photo
// Body: multipart/form-data with field "file" (image/*)
export async function POST(req: NextRequest) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 400 });
  }

  const supabase = createServerClient();
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const storagePath = `${session.user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-avatars")
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: dbError } = await supabase
    .from("deposit_users")
    .update({ avatar_path: storagePath })
    .eq("id", session.user.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Return the public URL
  const { data: urlData } = supabase.storage
    .from("profile-avatars")
    .getPublicUrl(storagePath);

  return NextResponse.json({ avatarPath: storagePath, publicUrl: urlData.publicUrl });
}
