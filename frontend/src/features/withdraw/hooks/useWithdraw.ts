"use client";

import { useEffect, useState } from "react";
import { getWithdrawData } from "@/src/services/api/withdraw.api";
import type {
  SavedBankAccount,
  WithdrawBalanceSummary,
  WithdrawHistoryItem,
} from "@/src/types/withdraw.types";

interface WithdrawData {
  balance: WithdrawBalanceSummary;
  banks: SavedBankAccount[];
  history: WithdrawHistoryItem[];
}

export function useWithdraw() {
  const [data, setData] = useState<WithdrawData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWithdrawData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const addToHistory = (item: WithdrawHistoryItem) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            history: [item, ...prev.history],
            balance: {
              ...prev.balance,
              pendingWithdrawals: prev.balance.pendingWithdrawals + item.amount,
              availableToWithdraw: prev.balance.availableToWithdraw - item.amount,
              dailyUsed: prev.balance.dailyUsed + item.amount,
              withdrawnThisMonth: prev.balance.withdrawnThisMonth + item.amount,
            },
          }
        : prev
    );
  };

  return { data, loading, addToHistory };
}
