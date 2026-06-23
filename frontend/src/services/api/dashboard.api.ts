import { simulateRequest } from "./client";
import type { DashboardMetrics } from "@/src/types/dashboard.types";

const MOCK_DASHBOARD: DashboardMetrics = {
  investor: {
    name: "Abebe Kebede",
    investorId: "ASC-78345",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBusOAkS0vXQCsiYdt0l1B0P0GSlULEzXZtEcn4ckhVFhzZsoyShRM4DV2KdT3kSZ5MjZVUBrBEbcA_8ffxp-nLeAaZI-BRNQ0RAmd-7BSW7-hLVbpbYfVjkNpvUGb3NpSKqxyJffuLg4PjiVGOGiNK4ngiOFHUXP6afdqDwkEtyfBs8PfPv8fZU6xDH904Htbs3P2ZdYBuW9GOU6ewYozUv5GXgZ9xedvqcgg7l7Es84xAHiTvYkYiK3oA18N532EGPQeLLthHYp8",
    notificationCount: 1,
  },
  walletAllocationNote: {
    allocatedBalance: 100,
  },
  fundPerformance: {
    ytdPercent: 23.5,
    totalProfit: 2840,
    netReturn: 2240,
    sparkline: [
      { value: 60 },
      { value: 55 },
      { value: 40 },
      { value: 30 },
      { value: 45 },
      { value: 20 },
      { value: 10 },
    ],
  },
  accountOverview: {
    availableForTrading: 1200,
    openPositions: 100,
    dailyGainLoss: 45.2,
  },
  strategyAllocation: [
    { name: "Forex Majors", percent: 40, color: "#3b82f6" },
    { name: "Commodities", percent: 30, color: "#10b981" },
    { name: "Indices", percent: 30, color: "#f59e0b" },
  ],
  traderInsights: [
    {
      id: "trader_1",
      name: "M. Chen - Forex Lead",
      role: "Forex Lead",
      bio: "Brief bios, concounced performance and bres-ho...",
      performanceLabel: "+8.1% MT",
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCTEL5jtSxPysSFhOoDCKBgCgAoJ0wjKz6TnOLfgGSTgia9dBDDqV8gTw0NOAl095Ru99e9b1Z1DfqGbyj6_KpMUF6UuWIjlciGlRuL0tXHahmq69xaJhsZRSBElzqOt4lCHivqJ98i2iW6clTwRhvuFDAhx3Sg5vcrrFITntgX8aSBx77LtKRxO5tFwP0FiDywSq3ArWVaNmZxnLlGtHb49jvhvQJJb5grtvjymNOYdT-YbMIsGdIXNT7BhTQgQ4JyO2IDFSzlC3k",
    },
    {
      id: "trader_2",
      name: "M. Chen - Forex Lead",
      role: "Forex Lead",
      bio: "Brief bios, concounced performance and bres-ho...",
      performanceLabel: "+8.1% MT",
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD7O7g53MjEgLhYniRuW--LRy1i3O7DkF1qF4owhbMCDBI1i8t9DJbFB2KB071MmJtflqZw9G7alH7TT4sh-6ZlOs9M4_zAu__yozZitnRT4ziPqZMYXRofwQF8MZTlytfXjPHL_jCT7WGSDWDJSK93ENKJE4jValqhfYfRSfENRyvDfjIjz5EGYknigdS4RE9zzeFJO2ClZOKQnb1r7W3bPqAyx9WNGOa2Gkgz50YzbbJZwKmcNRLKCWWP9FW22I6Kg8js2YP1n0s",
    },
  ],
  equityDrawdown: [
    { date: "May 15, 2025", equity: 200, drawdown: 200 },
    { date: "May 16, 2025", equity: 180, drawdown: 210 },
    { date: "May 17, 2025", equity: 160, drawdown: 230 },
    { date: "May 18, 2025", equity: 170, drawdown: 215 },
    { date: "May 19, 2025", equity: 140, drawdown: 225 },
    { date: "May 20, 2025", equity: 120, drawdown: 260 },
    { date: "May 21, 2025", equity: 100, drawdown: 240 },
  ],
  gainerLoser: {
    profitable: [
      { name: "Forex Profit", value: "+12,800%" },
      { name: "Assets", value: "+22.70%" },
    ],
    unprofitable: [
      { name: "Assets", value: "-8.8%" },
      { name: "Commodities", value: "-5.5%" },
      { name: "Indice", value: "-2.2%" },
    ],
  },
  riskMetrics: {
    leverage: "1:12",
    vix: 18.5,
    drawdownPercent: -1.8,
    drawdownZone: "Green Zone",
  },
  bestTrades: [
    {
      asset: "Forex USD",
      entryExit: "07:50 - 13:00",
      profit: 2840,
      riskReward: "2.5%",
    },
    {
      asset: "Forex USD",
      entryExit: "08:00 - 17:00",
      profit: 20,
      riskReward: "0.00",
    },
    {
      asset: "Forex USD",
      entryExit: "07:30 - 18:30",
      profit: 23,
      riskReward: "0.00",
    },
    {
      asset: "Asset USD",
      entryExit: "07:30 - 17:30",
      profit: 45.2,
      riskReward: "0.00",
    },
    {
      asset: "Asset USD",
      entryExit: "08:30 - 12:30",
      profit: 15,
      riskReward: "0.00",
    },
  ],
  investmentDistribution: [
    { strategy: "Forex Majors 40%", pool: "Pool 1", distribution: 40 },
    { strategy: "Commodities 30%", pool: "Pool 2", distribution: 30 },
    { strategy: "Indices 30%", pool: "Pool 3", distribution: 30 },
    { strategy: "Indices 30%", pool: "Pool 3", distribution: 20 },
    { strategy: "Strategy Ies 40%", pool: "Pool 3", distribution: 15 },
  ],
  footerBadges: [
    {
      title: "Secure Wallet",
      description: "Your funds are protected with bank-level security.",
      icon: "shield",
    },
    {
      title: "Fast Withdrawal",
      description: "Approved withdrawals are processed quickly.",
      icon: "bolt",
    },
    {
      title: "Easy Access",
      description: "Access your wallet anytime, anywhere.",
      icon: "phone",
    },
    {
      title: "Transparent",
      description: "100% transparency in all transactions.",
      icon: "document",
    },
  ],
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return simulateRequest({ ...MOCK_DASHBOARD }, 280);
}
