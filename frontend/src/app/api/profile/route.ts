import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

// GET /api/profile — return current investor's profile row
export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("deposit_users")
    .select(
      "id, email, full_name, phone_number, country, address, avatar_path, deposit_status, two_fa_enabled, created_at, role"
    )
    .eq("id", session.user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    profile: {
      id: data.id,
      email: data.email,
      fullName: data.full_name ?? "",
      phone: data.phone_number ?? "",
      country: data.country ?? "",
      address: data.address ?? "",
      avatarPath: data.avatar_path ?? null,
      depositStatus: data.deposit_status,
      twoFaEnabled: data.two_fa_enabled ?? false,
      createdAt: data.created_at,
      role: data.role,
    },
  });
}

// PATCH /api/profile — update personal fields
export async function PATCH(req: NextRequest) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    fullName?: string;
    phone?: string;
    country?: string;
    address?: string;
  };

  const updates: Record<string, string> = {};
  if (body.fullName !== undefined) updates.full_name = body.fullName.trim();
  if (body.phone !== undefined) updates.phone_number = body.phone.trim();
  if (body.country !== undefined) updates.country = body.country.trim();
  if (body.address !== undefined) updates.address = body.address.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("deposit_users")
    .update(updates)
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
