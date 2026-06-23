"use client";

import { useState } from "react";

import { LoadingScreen } from "@/src/shared/feedback/LoadingScreen";
import { useDashboardMetrics } from "@/src/features/dashboard/hooks/useDashboardMetrics";

import { DashboardFooterBadges } from "./DashboardFooterBadges";
import { DashboardTables } from "./DashboardTables";
import { FundEquitySection } from "./FundEquitySection";
import {
  DashboardInfoBanner,
  MetricsRow,
  PeriodSelector,
} from "./MetricsRow";

export function DashboardPage() {
  const { data, loading, error } = useDashboardMetrics();
  const [period, setPeriod] = useState("day");

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-8 text-sm text-[#ef4444]">
        {error ?? "Unable to load dashboard."}
      </div>
    );
  }

  return (
    <div className="px-8 py-6 xl:px-10">
      <div className="mb-8">
        <h2 className="mb-4 text-3xl font-extrabold text-gray-900">
          My Dashboard
        </h2>
        <PeriodSelector active={period} onChange={setPeriod} />
        <DashboardInfoBanner
          allocatedBalance={data.walletAllocationNote.allocatedBalance}
        />
      </div>

      <MetricsRow metrics={data} />
      <FundEquitySection metrics={data} />
      <DashboardTables metrics={data} />
      <DashboardFooterBadges badges={data.footerBadges} />
    </div>
  );
}
