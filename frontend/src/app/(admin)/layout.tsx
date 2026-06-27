import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";

import { AdminNavbar } from "@/src/shared/layouts/AdminNavbar";
import { AdminSidebar } from "@/src/shared/layouts/AdminSidebar";
import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";
import { SESSION_COOKIE } from "@/src/features/onboarding/lib/deposit-cookies";
import { ROUTES } from "@/src/lib/constants/routes";

// Hanken Grotesk via next/font (build-time optimised).
// JetBrains Mono is loaded via <link> below — next/font cannot reach
// fonts.googleapis.com in this dev environment so it causes a 2-min timeout.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function requireAdmin() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) redirect(ROUTES.LOGIN);
  try {
    const session = JSON.parse(raw) as DepositSession;
    if (session.user?.role !== "admin") redirect(ROUTES.DASHBOARD);
  } catch {
    redirect(ROUTES.LOGIN);
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* JetBrains Mono + Hanken Grotesk (browser fallback if next/font CSS vars aren't available) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap"
      />
      {/* Material Symbols Outlined */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
      />

      <div
        className={`
          theme-admin
          ${hanken.variable}
          font-(family-name:--font-hanken)
          flex h-screen overflow-hidden
        `}
      >
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden bg-[#f8f9fa]">
          <AdminNavbar />
          <main className="flex-1 min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
