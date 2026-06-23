import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  action?: "logout";
}

export interface AdminNavItem extends NavItem {
  badge?: number;
}
