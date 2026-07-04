import { createSupabaseSessionClient } from "@/src/lib/supabase/server";
import { getDepositUserById } from "@/src/features/onboarding/lib/deposit-store";
import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";

export function buildDepositSession(
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "investor" | "admin" | "super_admin";
  },
  depositStatus: DepositSession["depositStatus"],
  emailVerified = true,
  accessToken = ""
): DepositSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
    },
    accessToken,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    depositStatus,
    emailVerified,
  };
}

// Reads the caller's session directly from Supabase Auth (JWT-verified via
// getUser(), not decoded from a client-supplied cookie) and layers on their
// live deposit_users row. Always reflects current DB state — there is no
// separate cache to go stale, so callers that used to write a refreshed
// session back to a cookie no longer need to.
export async function getDepositSessionCookie(): Promise<DepositSession | null> {
  const supabase = await createSupabaseSessionClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const profile = await getDepositUserById(authUser.id);
  if (!profile) return null;

  return buildDepositSession(
    {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
    },
    profile.depositStatus,
    profile.emailVerified ?? false
  );
}

export async function clearDepositSessionCookie(): Promise<void> {
  const supabase = await createSupabaseSessionClient();
  await supabase.auth.signOut();
}
