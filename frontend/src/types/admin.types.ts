export interface AdminDashboardMetrics {
  totalAum: number;
  activeUsers: number;
  pendingDeposits: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  openPositions: number;
}

export interface NetworkAlert {
  id: string;
  severity: "warning" | "error" | "info";
  message: string;
  source: string;
  timestamp: string;
  resolved: boolean;
}

export interface LiquidityPool {
  id: string;
  name: string;
  reserve: number;
  targetAllocation: number;
  currentAllocation: number;
  asset: string;
}

export interface RebalancePayload {
  poolId: string;
  targetAllocation: number;
}

export interface SystemSettings {
  webhookUrl: string;
  apiKeyMasked: string;
  maintenanceMode: boolean;
  maxWithdrawalAmount: number;
  depositAutoApprove: boolean;
}

export interface SystemStatus {
  latencyMs: number;
  status: "healthy" | "degraded" | "down";
  uptime: string;
  lastChecked: string;
}
