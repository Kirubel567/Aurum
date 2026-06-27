export const ROUTES = {
  LOGIN: "/login",
  ONBOARDING: "/onboarding",
  DASHBOARD: "/dashboard",
  FUNDING: "/funding",
  FUNDING_UPLOAD: "/funding/upload",
  WALLET: "/wallet",
  WITHDRAW: "/withdraw",
  ORDERS: "/orders",
  LEGAL: "/legal",
  CONCIERGE: "/concierge",
  SUPPORT: "/support",
  PROFILE: "/profile",
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_DEPOSITS: "/admin/deposits",
  ADMIN_LIQUIDITY: "/admin/liquidity",
  ADMIN_SETTINGS: "/admin/settings",
  ADMIN_CONSOLE: "/admin/console",
  ADMIN_INBOX: "/admin/inbox",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
