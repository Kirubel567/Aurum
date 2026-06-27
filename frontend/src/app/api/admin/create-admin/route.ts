import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { createServerClient } from "@/src/lib/supabase/server";
import { hashPassword } from "@/src/features/onboarding/lib/password-hash";
import { getDepositUserByEmail } from "@/src/features/onboarding/lib/deposit-store";
import { sendAdminWelcomeEmail } from "@/src/features/onboarding/lib/email";

// One-time endpoint to bootstrap the first admin account.
// Secured by ADMIN_BOOTSTRAP_SECRET header — set this env var before calling.
// Call once, then remove the env var (or restrict the route).

export async function POST(request: Request) {
  const secret = request.headers.get("x-bootstrap-secret");
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email: string = body.email ?? process.env.ADMIN_EMAIL ?? "";
  const fullName: string = body.fullName ?? "Kirubel";

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  // Reject if admin already exists
  const existing = await getDepositUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: `User with email ${email} already exists.` },
      { status: 409 }
    );
  }

  // Generate a strong temporary password
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  const temporaryPassword = `Aurum@2025!${suffix}`;
  const hashedPassword = await hashPassword(temporaryPassword);

  const db = createServerClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("deposit_users")
    .insert({
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      full_name: fullName,
      role: "admin",
      deposit_status: "approved",
      email_verified: true,
      created_at: now,
      updated_at: now,
    })
    .select("id, email, role")
    .single();

  if (error) {
    console.error("[create-admin]", error.message);
    return NextResponse.json(
      { error: "Failed to create admin user." },
      { status: 500 }
    );
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

  try {
    await sendAdminWelcomeEmail(email, fullName, temporaryPassword, loginUrl);
  } catch (emailError) {
    // User was created — don't fail the request, just warn
    console.error("[create-admin] email failed:", emailError);
    return NextResponse.json({
      success: true,
      userId: data.id,
      email: data.email,
      temporaryPassword,
      warning: "Admin created but welcome email failed to send. Use the temporaryPassword above to log in.",
    });
  }

  return NextResponse.json({
    success: true,
    userId: data.id,
    email: data.email,
    message: "Admin account created. Welcome email sent to " + email,
  });
}
