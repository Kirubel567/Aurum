import { simulateRequest } from "./client";
import type {
  AdminDashboardMetrics,
  LiquidityPool,
  NetworkAlert,
  RebalancePayload,
  SystemSettings,
  SystemStatus,
} from "@/src/types/admin.types";
import type { TradeSignalPayload, TradeSignalResult } from "@/src/types/trade.types";

const MOCK_METRICS: AdminDashboardMetrics = {
  totalAum: 48_750_000,
  activeUsers: 847,
  pendingDeposits: 5,
  dailyPnl: 342_500,
  dailyPnlPercent: 0.71,
  openPositions: 128,
};

const MOCK_ALERTS: NetworkAlert[] = [
  {
    id: "alt_001",
    severity: "warning",
    message: "Elevated latency on trading feed — Binance WS",
    source: "Market Data Gateway",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    resolved: false,
  },
  {
    id: "alt_002",
    severity: "error",
    message: "Deposit verification queue backlog — 5 pending",
    source: "Funding Service",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    resolved: false,
  },
  {
    id: "alt_003",
    severity: "info",
    message: "Scheduled maintenance window in 4 hours",
    source: "Infrastructure",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    resolved: false,
  },
  {
    id: "alt_004",
    severity: "warning",
    message: "SSL certificate renewal due in 14 days",
    source: "Security Monitor",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    resolved: false,
  },
  {
    id: "alt_005",
    severity: "error",
    message: "Failed webhook delivery to compliance endpoint",
    source: "Webhook Service",
    timestamp: new Date(Date.now() - 180000).toISOString(),
    resolved: false,
  },
];

const MOCK_POOLS: LiquidityPool[] = [
  {
    id: "pool_001",
    name: "Crypto Trading Pool",
    reserve: 12_500_000,
    targetAllocation: 40,
    currentAllocation: 38,
    asset: "Multi-Asset",
  },
  {
    id: "pool_002",
    name: "Equities Pool",
    reserve: 18_200_000,
    targetAllocation: 35,
    currentAllocation: 36,
    asset: "US Equities",
  },
  {
    id: "pool_003",
    name: "Fixed Income Pool",
    reserve: 8_750_000,
    targetAllocation: 25,
    currentAllocation: 26,
    asset: "Bonds & Treasuries",
  },
];

const MOCK_SETTINGS: SystemSettings = {
  webhookUrl: "https://api.aurum.capital/webhooks/compliance",
  apiKeyMasked: "aur_••••••••••••4f2a",
  maintenanceMode: false,
  maxWithdrawalAmount: 500_000,
  depositAutoApprove: false,
};

const MOCK_STATUS: SystemStatus = {
  latencyMs: 42,
  status: "healthy",
  uptime: "99.97%",
  lastChecked: new Date().toISOString(),
};

export async function getDashboardMetrics(): Promise<AdminDashboardMetrics> {
  return simulateRequest({ ...MOCK_METRICS }, 280);
}

export async function getNetworkAlerts(): Promise<NetworkAlert[]> {
  return simulateRequest(
    MOCK_ALERTS.filter((a) => !a.resolved),
    250
  );
}

export async function getLiquidityPools(): Promise<LiquidityPool[]> {
  return simulateRequest([...MOCK_POOLS], 300);
}

export async function rebalancePool(
  payload: RebalancePayload
): Promise<LiquidityPool> {
  const pool = MOCK_POOLS.find((p) => p.id === payload.poolId);
  if (!pool) throw new Error("Pool not found");
  return simulateRequest(
    { ...pool, targetAllocation: payload.targetAllocation },
    400
  );
}

export async function getSettings(): Promise<SystemSettings> {
  return simulateRequest({ ...MOCK_SETTINGS }, 200);
}

export async function updateSettings(
  settings: Partial<SystemSettings>
): Promise<SystemSettings> {
  const updated = { ...MOCK_SETTINGS, ...settings };
  return simulateRequest(updated, 350);
}

export async function broadcastTradeSignal(
  payload: TradeSignalPayload
): Promise<TradeSignalResult> {
  const result: TradeSignalResult = {
    id: `sig_${Date.now()}`,
    status: "broadcast",
    createdAt: new Date().toISOString(),
  };
  return simulateRequest(result, 450);
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return simulateRequest({ ...MOCK_STATUS }, 150);
}
