"use client";

import { useEffect, useState } from "react";

import { getWalletPage } from "@/src/services/api/wallet.api";
import type { WalletPageData } from "@/src/types/wallet.types";

export function useWallet() {
  const [data, setData] = useState<WalletPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWalletPage()
      .then(setData)
      .catch(() => setError("Failed to load wallet data."))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
