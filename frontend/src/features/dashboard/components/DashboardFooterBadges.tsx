import {
  FileText,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";

import type { DashboardFooterBadge } from "@/src/types/dashboard.types";

const ICON_MAP = {
  shield: Shield,
  bolt: Zap,
  phone: Smartphone,
  document: FileText,
} as const;

interface DashboardFooterBadgesProps {
  badges: DashboardFooterBadge[];
}

export function DashboardFooterBadges({ badges }: DashboardFooterBadgesProps) {
  return (
    <footer className="grid grid-cols-1 gap-4 pb-10 md:grid-cols-2 xl:grid-cols-4">
      {badges.map((badge) => {
        const Icon = ICON_MAP[badge.icon];
        return (
          <div
            key={badge.title}
            className="flex items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-[#c4a24d]/10">
              <Icon className="size-5 text-blue-600 dark:text-[#c4a24d]" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white">{badge.title}</div>
              <div className="text-[10px] leading-tight text-gray-500 dark:text-white/40">
                {badge.description}
              </div>
            </div>
          </div>
        );
      })}
    </footer>
  );
}
