"use client";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  fetchWithdrawSummary,
  fetchWithdrawBanks,
  fetchWithdrawHistory,
} from "@/src/services/api/withdraw.api";

export function useWithdrawSummary() {
  return useQuery({
    queryKey: ["withdraw-summary"],
    queryFn:  fetchWithdrawSummary,
    staleTime: 30_000,
  });
}

export function useWithdrawBanks() {
  return useQuery({
    queryKey: ["withdraw-banks"],
    queryFn:  fetchWithdrawBanks,
    staleTime: 60_000,
  });
}

export function useWithdrawHistory() {
  return useQuery({
    queryKey: ["withdraw-history"],
    queryFn:  fetchWithdrawHistory,
    staleTime: 30_000,
  });
}

export function useInvalidateWithdraw() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["withdraw-summary"] });
    void qc.invalidateQueries({ queryKey: ["withdraw-history"] });
  };
}
