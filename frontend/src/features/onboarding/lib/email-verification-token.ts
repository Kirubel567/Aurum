import { randomBytes } from "crypto";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function getEmailVerificationExpiry(): string {
  return new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();
}

export function isVerificationTokenExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return true;
  return Date.now() > new Date(expiresAt).getTime();
}

export function resolveAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
