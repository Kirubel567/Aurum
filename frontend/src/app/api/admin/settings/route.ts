import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export interface SystemSettings {
  minDepositUsd: number;
  minWithdrawalUsd: number;
  standardWithdrawalFeePct: number;
  expressWithdrawalFeePct: number;
  lockupPeriodDays: number;
  updatedAt: string;
  updatedByName: string | null;
}

// GET /api/admin/settings — the singleton system_settings row. Staff only.
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();

    const { data, error } = await db
      .from("system_settings")
      .select("min_deposit_usd, min_withdrawal_usd, standard_withdrawal_fee_pct, express_withdrawal_fee_pct, lockup_period_days, updated_at, updated_by")
      .eq("id", 1)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let updatedByName: string | null = null;
    if (data.updated_by) {
      const { data: updater } = await db
        .from("deposit_users")
        .select("full_name")
        .eq("id", data.updated_by)
        .maybeSingle();
      updatedByName = updater?.full_name ?? null;
    }

    const settings: SystemSettings = {
      minDepositUsd: Number(data.min_deposit_usd),
      minWithdrawalUsd: Number(data.min_withdrawal_usd),
      standardWithdrawalFeePct: Number(data.standard_withdrawal_fee_pct),
      expressWithdrawalFeePct: Number(data.express_withdrawal_fee_pct),
      lockupPeriodDays: data.lockup_period_days,
      updatedAt: data.updated_at,
      updatedByName,
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[admin-settings] crashed:", error);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

// PATCH /api/admin/settings — update platform financial parameters.
// super_admin only (mirrors the system_settings RLS policy).
export async function PATCH(req: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only a super admin can change platform financial parameters." },
        { status: 403 }
      );
    }

    const body = await req.json() as Partial<{
      minDepositUsd: number;
      minWithdrawalUsd: number;
      standardWithdrawalFeePct: number;
      expressWithdrawalFeePct: number;
      lockupPeriodDays: number;
    }>;

    const update: Record<string, number | string> = {};

    const numField = (
      value: unknown,
      column: string,
      { min, max, integer = false }: { min: number; max: number; integer?: boolean }
    ): string | null => {
      if (value === undefined) return null;
      if (typeof value !== "number" || !Number.isFinite(value)) return `${column} must be a number`;
      if (integer && !Number.isInteger(value)) return `${column} must be a whole number`;
      if (value < min || value > max) return `${column} must be between ${min} and ${max}`;
      update[column] = value;
      return null;
    };

    const errors = [
      numField(body.minDepositUsd, "min_deposit_usd", { min: 0, max: 1_000_000 }),
      numField(body.minWithdrawalUsd, "min_withdrawal_usd", { min: 0, max: 1_000_000 }),
      numField(body.standardWithdrawalFeePct, "standard_withdrawal_fee_pct", { min: 0, max: 0.2 }),
      numField(body.expressWithdrawalFeePct, "express_withdrawal_fee_pct", { min: 0, max: 0.2 }),
      numField(body.lockupPeriodDays, "lockup_period_days", { min: 0, max: 1095, integer: true }),
    ].filter(Boolean);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    update.updated_at = new Date().toISOString();
    update.updated_by = session.user.id;

    const db = createServerClient();
    const { error } = await db.from("system_settings").update(update).eq("id", 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-settings-patch] crashed:", error);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}
