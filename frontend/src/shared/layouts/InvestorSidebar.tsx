"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { BrandLockup } from "@/src/app/(public)/_components/BrandLockup";
import { INVESTOR_NAV } from "@/src/lib/constants/navigation";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuth } from "@/src/hooks/useAuth";
import { cn } from "@/lib/utils";

import { SidebarSecurityCard } from "./SidebarSecurityCard";

export function InvestorSidebar() {
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
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-[#0B1221] text-gray-400">
      <div className="p-8">
        <BrandLockup
          href={ROUTES.DASHBOARD}
          tone="gold"
          iconClassName="h-10 w-10"
          wordmarkClassName="h-9 w-[190px]"
        />
      </div>

      <nav className="flex-1 space-y-1 px-4">
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
                "sidebar-item group flex items-center gap-3 rounded-md px-4 py-3 transition-all duration-200",
                item.badge ? "justify-between" : "",
                active
                  ? "border-l-[3px] border-[#C5A059] bg-linear-to-r from-[#C5A059]/15 to-transparent text-[#C5A059]"
                  : "hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
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

      <div className="p-6">
        <SidebarSecurityCard />
      </div>
    </aside>
  );
}
