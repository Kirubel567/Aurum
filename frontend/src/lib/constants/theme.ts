export const INVESTOR_COLORS = {
  bgStart: "#0A0E17",
  bgEnd: "#121824",
  gold: "#D4AF37",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  glassBg: "rgba(255, 255, 255, 0.03)",
  textPrimary: "#F8FAFC",
  textMuted: "#94A3B8",
} as const;

export const ADMIN_COLORS = {
  bgStart: "#F8F9FA",
  bgEnd: "#FFFFFF",
  navy: "#0C1017",
  divider: "#E2E8F0",
  textMuted: "#64748B",
} as const;

export const STATUS_COLORS = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#94A3B8",
} as const;

export const CHART_GRADIENTS = {
  investorGold: {
    start: "#D4AF37",
    end: "rgba(212, 175, 55, 0)",
  },
  adminNavy: {
    start: "#0C1017",
    end: "rgba(12, 16, 23, 0)",
  },
} as const;

export const MOTION = {
  fast: 150,
  normal: 250,
  slow: 400,
  ease: [0.4, 0, 0.2, 1] as const,
} as const;
