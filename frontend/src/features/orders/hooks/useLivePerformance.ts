"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getLivePerformance } from "@/src/services/api/orders.api";
import type { LivePerformanceData } from "@/src/types/trade.types";

const SYNC_INTERVAL_MS = 5000;

export function useLivePerformance() {
  const [data, setData] = useState<LivePerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveSync, setLiveSync] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return getLivePerformance()
      .then(setData)
      .catch(() => setError("Failed to load live performance data."))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!liveSync) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => fetchData(true), SYNC_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveSync, fetchData]);

  const toggleLiveSync = useCallback(() => {
    setLiveSync((prev) => !prev);
  }, []);

  return { data, loading, error, liveSync, toggleLiveSync, refetch: () => fetchData(true) };
}
