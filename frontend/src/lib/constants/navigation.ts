import {
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  LineChart,
  FileText,
  Headphones,
  MessageSquare,
  User,
  Users,
  Inbox,
  Droplets,
  Settings,
  Terminal,
  Shield,
} from "lucide-react";

import { ROUTES } from "./routes";
import type { AdminNavItem, NavItem } from "@/src/types/navigation.types";

export const INVESTOR_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Funding", href: ROUTES.FUNDING, icon: ArrowDownToLine },
  { label: "Wallet", href: ROUTES.WALLET, icon: Wallet },
  { label: "Orders", href: ROUTES.ORDERS, icon: LineChart },
  { label: "Legal", href: ROUTES.LEGAL, icon: FileText },
  { label: "Concierge", href: ROUTES.CONCIERGE, icon: Headphones },
  { label: "Support", href: ROUTES.SUPPORT, icon: MessageSquare },
  { label: "Profile", href: ROUTES.PROFILE, icon: User },
];

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: ROUTES.ADMIN, icon: LayoutDashboard },
  { label: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  { label: "Deposits", href: ROUTES.ADMIN_DEPOSITS, icon: Inbox, badge: 5 },
  { label: "Liquidity", href: ROUTES.ADMIN_LIQUIDITY, icon: Droplets },
  { label: "Console", href: ROUTES.ADMIN_CONSOLE, icon: Terminal },
  { label: "Inbox", href: ROUTES.ADMIN_INBOX, icon: MessageSquare, badge: 3 },
  { label: "Settings", href: ROUTES.ADMIN_SETTINGS, icon: Settings },
];

export const PUBLIC_NAV: NavItem[] = [
  { label: "Login", href: ROUTES.LOGIN, icon: Shield },
  { label: "Onboarding", href: ROUTES.ONBOARDING, icon: User },
];
