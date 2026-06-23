export type PerformancePeriod = "day" | "week" | "month" | "year";

export interface SparklinePoint {
  value: number;
}

export interface StrategyAllocation {
  name: string;
  percent: number;
  color: string;
}

export interface TraderInsight {
  id: string;
  name: string;
  role: string;
  bio: string;
  performanceLabel: string;
  avatarUrl: string;
}

export interface EquityDrawdownPoint {
  date: string;
  equity: number;
  drawdown: number;
}

export interface AssetPerformance {
  name: string;
  value: string;
}

export interface RiskMetrics {
  leverage: string;
  vix: number;
  drawdownPercent: number;
  drawdownZone: string;
}

export interface BestTradeRow {
  asset: string;
  entryExit: string;
  profit: number;
  riskReward: string;
}

export interface InvestmentDistributionRow {
  strategy: string;
  pool: string;
  distribution: number;
}

export interface DashboardFooterBadge {
  title: string;
  description: string;
  icon: "shield" | "bolt" | "phone" | "document";
}

export interface DashboardInvestor {
  name: string;
  investorId: string;
  avatarUrl: string;
  notificationCount: number;
}

export interface DashboardMetrics {
  investor: DashboardInvestor;
  walletAllocationNote: {
    allocatedBalance: number;
  };
  fundPerformance: {
    ytdPercent: number;
    totalProfit: number;
    netReturn: number;
    sparkline: SparklinePoint[];
  };
  accountOverview: {
    availableForTrading: number;
    openPositions: number;
    dailyGainLoss: number;
  };
  strategyAllocation: StrategyAllocation[];
  traderInsights: TraderInsight[];
  equityDrawdown: EquityDrawdownPoint[];
  gainerLoser: {
    profitable: AssetPerformance[];
    unprofitable: AssetPerformance[];
  };
  riskMetrics: RiskMetrics;
  bestTrades: BestTradeRow[];
  investmentDistribution: InvestmentDistributionRow[];
  footerBadges: DashboardFooterBadge[];
}
