import {
  ArrowDownToLine,
  ArrowUpCircle,
  BarChart3,
  CreditCard,
  Droplets,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Terminal,
  User,
  Users,
} from "lucide-react";

import { ROUTES } from "./routes";
import type { AdminNavItem, NavItem } from "@/src/types/navigation.types";

export const INVESTOR_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: Home },
  { label: "Live Performance", href: ROUTES.ORDERS, icon: BarChart3 },
  { label: "Wallet", href: ROUTES.WALLET, icon: CreditCard },
  { label: "Deposit", href: ROUTES.FUNDING, icon: ArrowDownToLine },
  { label: "Withdraw", href: ROUTES.WITHDRAW, icon: ArrowUpCircle },
  { label: "My Account Manager", href: ROUTES.CONCIERGE, icon: User },
  {
    label: "AI Support",
    href: ROUTES.SUPPORT,
    icon: MessageCircle,
    badge: "24/7",
  },
  { label: "My Contract", href: ROUTES.LEGAL, icon: FileText },
  { label: "Profile Settings", href: ROUTES.PROFILE, icon: Settings },
  { label: "Logout", href: ROUTES.LOGIN, icon: LogOut, action: "logout" },
];

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: ROUTES.ADMIN, icon: LayoutDashboard },
  { label: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  { label: "Deposits", href: ROUTES.ADMIN_DEPOSITS, icon: Inbox, badge: 5 },
  { label: "Liquidity", href: ROUTES.ADMIN_LIQUIDITY, icon: Droplets },
  { label: "Console", href: ROUTES.ADMIN_CONSOLE, icon: Terminal },
  { label: "Inbox", href: ROUTES.ADMIN_INBOX, icon: MessageCircle, badge: 3 },
  { label: "Settings", href: ROUTES.ADMIN_SETTINGS, icon: Settings },
];

export const PUBLIC_NAV: NavItem[] = [
  { label: "Login", href: ROUTES.LOGIN, icon: User },
  { label: "Onboarding", href: ROUTES.ONBOARDING, icon: User },
];
