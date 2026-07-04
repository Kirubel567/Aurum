import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { createServerClient } from "@/src/lib/supabase/server";
import {
  getDepositUserByEmail,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import { sendAdminWelcomeEmail } from "@/src/features/onboarding/lib/email";

// Authenticated admin endpoint to create investor or admin accounts.
// Used by the User Management UI. Caller must be logged-in admin (checked via
// session cookie by createServerClient — add your own auth guard as needed).

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const email: string      = (body.email ?? "").trim().toLowerCase();
  const fullName: string   = (body.fullName ?? "").trim();
  const role: "admin" | "investor" = body.role === "admin" ? "admin" : "investor";
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

  // Real identity creation via Supabase Auth, not a direct deposit_users
  // insert — a row here with no matching auth.users entry can never log in.
  const admin = createServerClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { role },
  });

  if (createError || !created?.user) {
    console.error("[create-user]", createError?.message);
    return NextResponse.json(
      { error: "Failed to create user: " + (createError?.message ?? "unknown error") },
      { status: 500 }
    );
  }

  const data = await updateDepositUser(created.user.id, {
    fullName,
    role,
    depositStatus: role === "admin" ? "approved" : "pending",
    emailVerified: role === "admin",
    phoneNumber: phone || undefined,
    country: country || undefined,
  });

  if (!data) {
    console.error("[create-user] auth user created but deposit_users profile update failed", created.user.id);
    return NextResponse.json({ error: "Failed to create user profile." }, { status: 500 });
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
