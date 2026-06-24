import { cookies } from "next/headers";

import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";

export const SESSION_COOKIE = "aurum_deposit_session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function setDepositSessionCookie(
  session: DepositSession
): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function getDepositSessionCookie(): Promise<DepositSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DepositSession;
  } catch {
    return null;
  }
}

export async function clearDepositSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export function buildDepositSession(
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "investor" | "admin";
  },
  depositStatus: DepositSession["depositStatus"],
  emailVerified = true
): DepositSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
    },
    accessToken: `mock_token_${user.id}`,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    depositStatus,
    emailVerified,
  };
}
