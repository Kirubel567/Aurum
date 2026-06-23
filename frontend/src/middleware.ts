import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/src/features/onboarding/lib/deposit-cookies";
import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";
import { ROUTES } from "@/src/lib/constants/routes";

const INVESTOR_PATHS = [
  ROUTES.DASHBOARD,
  ROUTES.WALLET,
  ROUTES.ORDERS,
  ROUTES.FUNDING,
  ROUTES.LEGAL,
  ROUTES.CONCIERGE,
  ROUTES.SUPPORT,
  ROUTES.PROFILE,
];

function isInvestorPath(pathname: string): boolean {
  return INVESTOR_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function readSession(request: NextRequest): DepositSession | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DepositSession;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isInvestorPath(pathname)) {
    return NextResponse.next();
  }

  const session = readSession(request);
  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.LOGIN;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
