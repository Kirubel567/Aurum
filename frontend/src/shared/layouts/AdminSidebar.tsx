"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { useTheme } from "@/src/hooks/useTheme";

import { cn } from "@/lib/utils";
import { BrandLockup } from "@/src/app/(public)/_components/BrandLockup";
import { ADMIN_NAV } from "@/src/lib/constants/navigation";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuthStore } from "@/src/store/auth.store";

function isNavActive(pathname: string, href: string): boolean {
  if (href === ROUTES.ADMIN_DASHBOARD) {
    return pathname === href || pathname === ROUTES.ADMIN;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = useAuthStore((s) => s.session?.user);
  const { isDark } = useTheme();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(ROUTES.LOGIN);
  }

  return (
    <aside
      className={cn(
        // Mobile: fixed overlay, slides in
        "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-shrink-0 flex-col border-r border-white/[0.07]",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: static, part of normal flow
        "lg:static lg:inset-auto lg:h-screen lg:translate-x-0 lg:z-auto"
      )}
      style={{ background: "#0B1221" }}
    >
      {/* ── Mobile close button ─────────────────────────────────────────────── */}
      <button
        onClick={onClose}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
        aria-label="Close menu"
      >
        <X className="size-5" />
      </button>

      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-7 pb-1">
        <BrandLockup
          href={ROUTES.ADMIN_DASHBOARD}
          tone="gold"
          iconClassName="h-8 w-8 sm:h-8 sm:w-8"
          wordmarkClassName="h-7 w-[155px] sm:h-7 sm:w-[155px]"
          priority
        />
        <p className="mt-3 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-white/25">
          Institutional Grade Admin
        </p>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-[2px]">
          {ADMIN_NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = isNavActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between rounded-md px-4 py-3 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "border-l-[3px] border-[#C5A059] bg-linear-to-r from-[#C5A059]/15 to-transparent text-[#C5A059]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-5 flex-shrink-0 transition-colors duration-200",
                      active ? "text-[#C5A059]" : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  {label}
                </span>

                {typeof badge === "number" && badge > 0 && (
                  <span
                    className={cn(
                      "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none",
                      active ? "bg-[#C5A059] text-[#050b14]" : "bg-white/10 text-white/50"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium text-gray-400 transition-all duration-200 hover:text-white"
          >
            <LogOut className="size-5 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors duration-200" />
            Logout
          </button>
        </div>
      </nav>

      {/* ── User profile ────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-3 pb-5 pt-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-white/[0.03]">
          <div
            className="flex size-8 flex-shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 text-[11px] font-bold text-[#d4af37]"
            style={{ background: "rgba(212,175,55,0.07)" }}
          >
            {initials}
          </div>
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
