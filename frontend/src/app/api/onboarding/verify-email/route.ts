import { NextResponse } from "next/server";

import { processEmailVerificationToken } from "@/src/features/onboarding/lib/process-email-verification";
import { resolveAppBaseUrl } from "@/src/features/onboarding/lib/email-verification-token";
import { ROUTES } from "@/src/lib/constants/routes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const baseUrl = resolveAppBaseUrl();

  if (!token) {
    return NextResponse.redirect(
      `${baseUrl}${ROUTES.LOGIN}?error=missing_verification_token`
    );
  }

  try {
    const result = await processEmailVerificationToken(token);

    if (result.status === "verified" || result.status === "already_verified") {
      return NextResponse.redirect(
        `${baseUrl}${ROUTES.DASHBOARD}?emailVerified=1`
      );
    }

    if (result.status === "expired_token") {
      return NextResponse.redirect(
        `${baseUrl}${ROUTES.LOGIN}?error=verification_expired`
      );
    }

    return NextResponse.redirect(
      `${baseUrl}${ROUTES.LOGIN}?error=invalid_verification_token`
    );
  } catch {
    return NextResponse.redirect(
      `${baseUrl}${ROUTES.LOGIN}?error=verification_failed`
    );
  }
}
