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
            className="flex items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <Icon className="size-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">{badge.title}</div>
              <div className="text-[10px] leading-tight text-gray-500">
                {badge.description}
              </div>
            </div>
          </div>
        );
      })}
    </footer>
  );
}
