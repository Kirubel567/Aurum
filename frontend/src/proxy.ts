import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No Supabase auth cookies at all → nothing to refresh, and investor paths
  // can short-circuit straight to login.
  const hasAuthCookies = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookies) {
    if (isInvestorPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ROUTES.LOGIN;
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() runs for EVERY matched request, not just investor paths — this
  // is what keeps sessions alive. Supabase rotates refresh tokens, and Server
  // Components can't persist rotated cookies (read-only there); if this
  // write-back only happened on investor paths, any rotation triggered from
  // an admin page or API route would be lost and the stale token would kill
  // the whole session on its next use (refresh-token reuse detection).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isInvestorPath(pathname)) {
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.LOGIN;
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("deposit_users")
    .select("role, deposit_status")
    .eq("id", user.id)
    .maybeSingle();

  // No matching deposit_users row is treated as the most restrictive case
  // (not staff, not approved) rather than fail-open.
  const isStaff = profile != null && profile.role !== "investor";

  if (!isStaff && profile?.deposit_status !== "approved" && pathname !== ROUTES.DASHBOARD) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = ROUTES.DASHBOARD;
    return NextResponse.redirect(gateUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
