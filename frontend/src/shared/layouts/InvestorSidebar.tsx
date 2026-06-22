"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { INVESTOR_NAV } from "@/src/lib/constants/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function InvestorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/[0.08] glass-panel-xl rounded-none">
      <div className="border-b border-white/[0.08] px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#D4AF37]/20 text-sm font-bold text-[#D4AF37]">
            A
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">AURUM</p>
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
              Investor Portal
            </p>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {INVESTOR_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-normal",
                  isActive
                    ? "border-l-2 border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] gold-glow-sm"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
