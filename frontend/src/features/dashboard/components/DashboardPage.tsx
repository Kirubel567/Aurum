"use client";

import { useState } from "react";

import { LoadingScreen } from "@/src/shared/feedback/LoadingScreen";
import { useDashboardMetrics } from "@/src/features/dashboard/hooks/useDashboardMetrics";
import {
  useDashboardSummary,
  useDashboardTrading,
  useEquityCurve,
} from "@/src/features/dashboard/hooks/useDashboardData";

import { DashboardFooterBadges } from "./DashboardFooterBadges";
import { DashboardTables } from "./DashboardTables";
import { FundEquitySection } from "./FundEquitySection";
import { RecentTransactions } from "./RecentTransactions";
import {
  DashboardInfoBanner,
  MetricsRow,
  PeriodSelector,
} from "./MetricsRow";

export function DashboardPage() {
  // Mock source — after Phase 2+11 this only feeds risk metrics (Phase 16)
  // and the static footer badges. Everything else is real.
  const { data, loading, error } = useDashboardMetrics();
  const [period, setPeriod] = useState("day");

  const summaryQuery = useDashboardSummary();
  const curveQuery = useEquityCurve(period);
  const tradingQuery = useDashboardTrading();

  if (loading || summaryQuery.isLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (error || !data || summaryQuery.isError || !summaryQuery.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-8 text-sm text-[#ef4444]">
        {error ?? "Unable to load dashboard."}
      </div>
    );
  }

  const summary = summaryQuery.data;
  const curve = curveQuery.data ?? null;
  const trading = tradingQuery.data ?? null;

  return (
    <div className="px-8 py-6 xl:px-10">
      <div className="mb-8">
        <h2 className="mb-4 text-3xl font-extrabold text-gray-900 dark:text-white">
          My Dashboard
        </h2>
        <PeriodSelector active={period} onChange={setPeriod} />
        <DashboardInfoBanner allocatedBalance={Math.max(0, summary.balance - summary.lockedPrincipal)} />
      </div>

      <MetricsRow period={period} summary={summary} curve={curve} trading={trading} />
      <FundEquitySection curve={curve} trading={trading} />
      <RecentTransactions transactions={summary.recentTransactions} />
      <DashboardTables trading={trading} />
      <DashboardFooterBadges badges={data.footerBadges} />
    </div>
  );
}
