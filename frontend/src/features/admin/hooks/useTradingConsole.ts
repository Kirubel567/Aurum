"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ConsoleExecution {
  id: string;
  strategy_pool_id: string;
  asset_pair: string;
  side: "LONG" | "SHORT";
  leverage: string | null;
  lot_size: number | null;
  entry_price: number;
  current_price: number | null;
  take_profit_price: number | null;
  stop_loss_price: number | null;
  status: "open" | "closed";
  realized_pl_usd: number | null;
  opened_at: string;
  closed_at: string | null;
  target_investor_id: string | null;
  strategy_pools: { name: string } | null;
  deposit_users: { full_name: string } | null; // targeted investor's name, if any
}

export interface ConsolePool {
  id: string;
  name: string;
  sort_order: number;
}

const CONSOLE_KEY = ["console-executions"];

async function jsonOrThrow(res: Response) {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

// Defaults to open-only (the console's job is managing what's running);
// pass "closed" for the settled-trades feed.
export function useConsoleExecutions(status: "open" | "closed" = "open") {
  return useQuery({
    queryKey: [...CONSOLE_KEY, status],
    queryFn: async (): Promise<{ executions: ConsoleExecution[]; pools: ConsolePool[] }> => {
      const res = await fetch(`/api/admin/console/executions?status=${status}`, { cache: "no-store" });
      return jsonOrThrow(res);
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

export function useOpenPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      strategyPoolId: string;
      assetPair: string;
      side: "LONG" | "SHORT";
      lotSize: number;
      entryPrice: number;
      takeProfitPrice?: number;
      stopLossPrice?: number;
      note?: string;
      targetInvestorId?: string;
    }) => {
      const res = await fetch("/api/admin/console/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return jsonOrThrow(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONSOLE_KEY }),
  });
}

export function useClosePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; closePrice?: number; realizedPlUsd: number }) => {
      const res = await fetch(`/api/admin/console/executions/${input.id}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closePrice: input.closePrice, realizedPlUsd: input.realizedPlUsd }),
      });
      return jsonOrThrow(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONSOLE_KEY }),
  });
}

export function useUpdatePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; currentPrice: number }) => {
      const res = await fetch(`/api/admin/console/executions/${input.id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrice: input.currentPrice }),
      });
      return jsonOrThrow(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONSOLE_KEY }),
  });
}

// An `admin`'s own assigned-investor roster, for the console's targeting
// picker. super_admin doesn't need this — they get the full search instead.
export function useMyAssignedInvestors(enabled: boolean) {
  return useQuery({
    queryKey: ["my-assigned-investors"],
    enabled,
    queryFn: async (): Promise<{
      assignments: { investorId: string; investorName: string; investorEmail: string }[];
    }> => {
      const res = await fetch("/api/admin/assignments?mine=true", { cache: "no-store" });
      return jsonOrThrow(res);
    },
    staleTime: 30_000,
  });
}

export interface LivePriceResponse {
  available: boolean;
  price?: number;
  source?: string;
  asOf?: string;
  reason?: string;
}

export async function fetchMarketPrice(assetPair: string): Promise<LivePriceResponse> {
  const res = await fetch(`/api/admin/console/market-price?assetPair=${encodeURIComponent(assetPair)}`, {
    cache: "no-store",
  });
  return jsonOrThrow(res);
}
