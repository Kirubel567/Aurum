"use client";

import { useEffect, useState } from "react";

import { getLivePerformance } from "@/src/services/api/orders.api";
import type { LivePerformanceData } from "@/src/types/trade.types";

export function useLivePerformance() {
  const [data, setData] = useState<LivePerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLivePerformance()
      .then(setData)
      .catch(() => setError("Failed to load live performance data."))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
