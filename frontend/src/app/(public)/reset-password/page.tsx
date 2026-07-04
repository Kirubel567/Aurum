import type { Metadata } from "next";

import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password — Aurum Sovereign Capital",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash } = await searchParams;
  return <ResetPasswordForm tokenHash={token_hash ?? ""} />;
}
