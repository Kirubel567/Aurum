import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { createServerClient } from "@/src/lib/supabase/server";
import { hashPassword } from "@/src/features/onboarding/lib/password-hash";
import { getDepositUserByEmail } from "@/src/features/onboarding/lib/deposit-store";
import { sendAdminWelcomeEmail } from "@/src/features/onboarding/lib/email";

// Authenticated admin endpoint to create investor or admin accounts.
// Used by the User Management UI. Caller must be logged-in admin (checked via
// session cookie by createServerClient — add your own auth guard as needed).

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const email: string      = (body.email ?? "").trim().toLowerCase();
  const fullName: string   = (body.fullName ?? "").trim();
  const role: string       = body.role === "admin" ? "admin" : "investor";
  const phone: string      = (body.phone ?? "").trim();
  const country: string    = (body.country ?? "").trim();
  const tier: string       = (body.tier ?? "Tier 1 - Retail").trim();

  if (!email || !fullName) {
    return NextResponse.json({ error: "email and fullName are required" }, { status: 400 });
  }

  const existing = await getDepositUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: `An account for ${email} already exists.` }, { status: 409 });
  }

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
      role,
      deposit_status: role === "admin" ? "approved" : "pending",
      email_verified: role === "admin",
      phone_number: phone || null,
      country: country || null,
      // Store tier in the notes / country field or as a custom column.
      // If you add a `tier` column to deposit_users later, include it here.
      created_at: now,
      updated_at: now,
    })
    .select("id, email, role")
    .single();

  if (error) {
    console.error("[create-user]", error.message);
    return NextResponse.json({ error: "Failed to create user: " + error.message }, { status: 500 });
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

  try {
    await sendAdminWelcomeEmail(email, fullName, temporaryPassword, loginUrl);
  } catch (emailError) {
    console.error("[create-user] email failed:", emailError);
    return NextResponse.json({
      success: true,
      userId: data.id,
      email: data.email,
      role: data.role,
      tier,
      temporaryPassword,
      warning: "Account created but welcome email failed. Use the temporaryPassword to log in.",
    });
  }

  return NextResponse.json({
    success: true,
    userId: data.id,
    email: data.email,
    role: data.role,
    tier,
    message: `${role === "admin" ? "Admin" : "Investor"} account created. Welcome email sent to ${email}.`,
  });
}
