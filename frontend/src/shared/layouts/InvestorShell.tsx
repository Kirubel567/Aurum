"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { InvestorNavbar } from "./InvestorNavbar";
import { InvestorSidebar } from "./InvestorSidebar";

export function InvestorShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on every route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-[#F3F4F6]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <InvestorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-30">
          <InvestorNavbar onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
