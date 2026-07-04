"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PoolAllocationSummary {
  id: string;
  name: string;
  tagColor: string;
  investorCount: number;
  averageAllocationPct: number;
}

export function usePoolAllocationSummary() {
  return useQuery({
    queryKey: ["pool-allocations-summary"],
    queryFn: async (): Promise<{ pools: PoolAllocationSummary[] }> => {
      const res = await fetch("/api/admin/pool-allocations/summary", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load allocation summary");
      return res.json();
    },
    staleTime: 15_000,
  });
}

export interface InvestorPoolAllocation {
  id: string;
  name: string;
  tagColor: string;
  allocationPct: number;
}

export function useInvestorAllocations(investorId: string | null) {
  return useQuery({
    queryKey: ["investor-allocations", investorId],
    enabled: !!investorId,
    queryFn: async (): Promise<{
      investor: { id: string; name: string; email: string };
      pools: InvestorPoolAllocation[];
    }> => {
      const res = await fetch(`/api/admin/pool-allocations/${investorId}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to load investor allocations");
      return payload;
    },
  });
}

export function useSaveInvestorAllocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      investorId: string;
      allocations: { poolId: string; allocationPct: number }[];
    }) => {
      const res = await fetch(`/api/admin/pool-allocations/${input.investorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations: input.allocations }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to save allocations");
      return payload;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["investor-allocations", variables.investorId] });
      queryClient.invalidateQueries({ queryKey: ["pool-allocations-summary"] });
    },
  });
}
