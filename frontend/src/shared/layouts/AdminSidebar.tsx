"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV } from "@/src/lib/constants/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-[#E2E8F0] bg-white">
      <div className="border-b border-[#E2E8F0] px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-[#0C1017] text-xs font-bold text-white">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0C1017]">AURUM</p>
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
              Admin Terminal
            </p>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {ADMIN_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-normal",
                  isActive
                    ? "bg-[#0C1017] font-medium text-white"
                    : "text-[#0C1017]/70 hover:bg-[#F1F5F9] hover:text-[#0C1017]"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-3.5 shrink-0" />
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 min-w-5 px-1 text-[10px]",
                      isActive && "bg-white/20 text-white"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
