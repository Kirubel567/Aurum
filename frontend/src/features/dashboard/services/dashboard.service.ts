import { getDashboardMetrics } from "@/src/services/api/dashboard.api";
import type { DashboardMetrics } from "@/src/types/dashboard.types";

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return getDashboardMetrics();
}
