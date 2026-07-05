"use client";

import { useQuery } from "@tanstack/react-query";

// Real backend data for the dashboard (Phase 1). The Phase-2-dependent
// cards (strategy allocation, trades, risk metrics) still come from the
// mock in useDashboardMetrics until their tables exist.

export interface DashboardSummary {
  balance: number;
  lockedPrincipal: number;
  availableForTrading: number;
  monthToDateProfit: number;
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    note: string | null;
    date: string;
  }[];
}

export interface EquityCurve {
  period: string;
  points: { date: string; equity: number; drawdown: number }[];
  changePercent: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async (): Promise<DashboardSummary> => {
      const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard summary");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export interface DashboardTrading {
  allocation: { name: string; percent: number; color: string }[];
  distribution: { strategy: string; pool: string; distribution: number }[];
  gainerLoser: {
    profitable: { name: string; value: string }[];
    unprofitable: { name: string; value: string }[];
  };
  bestTrades: { asset: string; entryExit: string; profit: number; riskReward: string }[];
  openPositionsCount: number;
}

export function useDashboardTrading() {
  return useQuery({
    queryKey: ["dashboard-trading"],
    queryFn: async (): Promise<DashboardTrading> => {
      const res = await fetch("/api/dashboard/trading", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load trading data");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export interface RiskMetricsData {
  leverage: string;
  volatility: number;
  drawdownPercent: number;
  drawdownZone: string;
}

export function useRiskMetrics() {
  return useQuery({
    queryKey: ["risk-metrics"],
    queryFn: async (): Promise<RiskMetricsData> => {
      const res = await fetch("/api/dashboard/risk-metrics", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load risk metrics");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useEquityCurve(period: string) {
  return useQuery({
    queryKey: ["equity-curve", period],
    queryFn: async (): Promise<EquityCurve> => {
      const res = await fetch(`/api/dashboard/equity-curve?period=${encodeURIComponent(period)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load equity curve");
      return res.json();
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
