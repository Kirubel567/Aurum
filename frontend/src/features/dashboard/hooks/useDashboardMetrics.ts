"use client";

import { useEffect, useState } from "react";

import { fetchDashboardMetrics } from "@/src/features/dashboard/services/dashboard.service";
import type { DashboardMetrics } from "@/src/types/dashboard.types";

export function useDashboardMetrics() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics()
      .then(setData)
      .catch(() => setError("Failed to load dashboard metrics."))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
