"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { BrandLockup } from "@/src/app/(public)/_components/BrandLockup";
import { INVESTOR_NAV } from "@/src/lib/constants/navigation";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuth } from "@/src/hooks/useAuth";
import { cn } from "@/lib/utils";

import { SidebarSecurityCard } from "./SidebarSecurityCard";

interface InvestorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function InvestorSidebar({ isOpen = false, onClose }: InvestorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleNavClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    action?: "logout"
  ) => {
    if (action !== "logout") return;
    e.preventDefault();
    await logout();
    router.push(ROUTES.LOGIN);
  };

  return (
    <aside
      className={cn(
        // Base — always fixed on mobile so it overlays content
        "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#0B1221] text-gray-400",
        // Slide transition
        "transition-transform duration-300 ease-in-out",
        // Mobile: hidden by default, slide in when open
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: sticky so it stays in view while page content scrolls
        // overflow-y-auto with hidden scrollbar handles rare cases where sidebar content
        // exceeds the viewport height (e.g. very short screens / high zoom levels)
        "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
      )}
    >
      {/* Close button — mobile only */}
      <button
        onClick={onClose}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
        aria-label="Close menu"
      >
        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      <div className="px-6 pt-7 pb-1">
        <BrandLockup
          href={ROUTES.DASHBOARD}
          tone="gold"
          iconClassName="h-8 w-8"
          wordmarkClassName="h-7 w-[155px]"
        />
      </div>

      <nav className="flex-1 space-y-[2px] px-4 py-4">
        {INVESTOR_NAV.map((item) => {
          const Icon = item.icon;

          const active =
            item.action !== "logout" &&
            (item.label === "Deposit"
              ? pathname.startsWith(ROUTES.FUNDING)
              : item.label === "Wallet"
                ? pathname === ROUTES.WALLET
                : item.label === "Withdraw"
                  ? pathname === ROUTES.WITHDRAW
                  : pathname === item.href ||
                    (item.href !== ROUTES.DASHBOARD &&
                      pathname.startsWith(item.href)));

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.action)}
              className={cn(
                "sidebar-item group flex items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium transition-all duration-200",
                item.badge ? "justify-between" : "",
                active
                  ? "border-l-[3px] border-[#C5A059] bg-linear-to-r from-[#C5A059]/15 to-transparent text-[#C5A059]"
                  : "hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-5 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-500">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 p-5">
        <SidebarSecurityCard />
      </div>
    </aside>
  );
}
