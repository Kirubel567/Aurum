"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Landmark, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/src/lib/constants/navigation";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuthStore } from "@/src/store/auth.store";

// ── Active-state guard ────────────────────────────────────────────────────────
// Dashboard uses exact match; all other routes prefix-match their sub-trees.
function isNavActive(pathname: string, href: string): boolean {
  if (href === ROUTES.ADMIN_DASHBOARD) {
    return pathname === href || pathname === ROUTES.ADMIN;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const router  = useRouter();
  const user    = useAuthStore((s) => s.session?.user);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "A";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(ROUTES.LOGIN);
  }

  return (
    <aside
      className="flex h-full w-64 flex-shrink-0 flex-col border-r border-white/[0.07] z-50"
      style={{ background: "#050b14" }}
    >
      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-7 pb-6">
        <Link
          href={ROUTES.ADMIN_DASHBOARD}
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40 rounded-lg"
        >
          {/* Icon badge */}
          <div
            className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/20"
            style={{ background: "rgba(212,175,55,0.07)" }}
          >
            <Landmark className="size-[17px] text-[#d4af37]" />
          </div>

          {/* Wordmark */}
          <div>
            <h1 className="text-[15px] font-extrabold leading-none tracking-tight text-[#d4af37]">
              AURUM
            </h1>
            <p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.22em] text-[#d4af37]/45">
              Sovereign Capital
            </p>
          </div>
        </Link>

        {/* Admin tier label */}
        <p className="mt-4 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-white/18">
          Institutional Grade Admin
        </p>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        <div className="space-y-[3px]">
          {ADMIN_NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = isNavActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-[150ms]",
                  // Left accent bar slot
                  "before:absolute before:left-0 before:top-[20%] before:h-[60%] before:w-[3px] before:rounded-r-full before:transition-all before:duration-[150ms]",
                  active
                    ? "bg-[#d4af37]/[0.08] text-[#d4af37] font-semibold before:bg-[#d4af37]"
                    : "text-[#d0c5af]/60 hover:bg-white/[0.04] hover:text-white/85 before:bg-transparent hover:before:bg-white/20"
                )}
                style={
                  active
                    ? { boxShadow: "inset 0 0 20px rgba(212,175,55,0.04), 0 0 12px rgba(212,175,55,0.06)" }
                    : undefined
                }
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-[17px] flex-shrink-0 transition-colors duration-[150ms]",
                      active
                        ? "text-[#d4af37]"
                        : "text-[#d0c5af]/40 group-hover:text-white/65"
                    )}
                  />
                  {label}
                </span>

                {/* Badge */}
                {typeof badge === "number" && badge > 0 && (
                  <span
                    className={cn(
                      "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none",
                      active
                        ? "bg-[#d4af37] text-[#050b14]"
                        : "bg-white/10 text-white/50"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Footer actions ─────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-2">
        {/* System status pill */}
        <div className="mb-1.5 flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
          <span className="relative flex size-2 flex-shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] font-semibold text-emerald-400/80">
            System Online
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-[#ff6b6b]/55 transition-all duration-[150ms] hover:bg-[#ff4444]/[0.07] hover:text-[#ff6b6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25"
        >
          <LogOut className="size-[17px] flex-shrink-0" />
          Logout Session
        </button>
      </div>

      {/* ── User profile ────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-3 pb-5 pt-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-[150ms] hover:bg-white/[0.03]">
          {/* Avatar */}
          <div
            className="flex size-8 flex-shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 text-[11px] font-bold text-[#d4af37]"
            style={{ background: "rgba(212,175,55,0.07)" }}
          >
            {initials}
          </div>

          {/* Name + role */}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white/80">
              {user?.name ?? "Admin"}
            </p>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#d4af37]/50">
              Senior Admin
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
