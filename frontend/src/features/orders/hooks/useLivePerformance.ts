"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LivePerformanceData } from "@/src/types/trade.types";

const SYNC_INTERVAL_MS = 5000;

// Real endpoint (Phase 2) — one consolidated payload per poll tick.
async function getLivePerformance(): Promise<LivePerformanceData> {
  const res = await fetch("/api/orders/live", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load live performance");
  return res.json();
}

export function useLivePerformance() {
  const [data, setData] = useState<LivePerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // `loading` starts true and is only cleared by the first fetch resolving —
  // every setState here happens asynchronously (in .then/.finally), which
  // keeps the effect body itself free of synchronous state updates.
  const fetchData = useCallback((initial = false) => {
    return getLivePerformance()
      .then(setData)
      .catch(() => setError("Failed to load live performance data."))
      .finally(() => {
        if (initial) setLoading(false);
      });
  }, []);

  useEffect(() => {
    void fetchData(true);
  }, [fetchData]);

  // Always live: trades appear in real time, no pause toggle.
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(true), SYNC_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}
