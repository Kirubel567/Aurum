export interface TradeOrder {
  id: string;
  asset: string;
  direction: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  status: "open" | "closed" | "cancelled";
  openedAt: string;
  closedAt?: string;
}

export interface Position {
  id: string;
  asset: string;
  direction: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface OrderFilter {
  status?: TradeOrder["status"];
  asset?: string;
  direction?: TradeOrder["direction"];
}

export interface TradeSignalPayload {
  asset: string;
  direction: "buy" | "sell";
  entryPrice: number;
  notes?: string;
}

export interface TradeSignalResult {
  id: string;
  status: "broadcast" | "queued";
  createdAt: string;
}

export interface AumPoint {
  date: string;
  aum: number;
  inflows: number;
  outflows: number;
}

// ── Live Performance types ────────────────────────────────────────────────────

export interface ActiveExecution {
  id: string;
  time: string;
  assetPair: string;
  type: "LONG" | "SHORT";
  leverage: string;
  entry: string;
  current: string;
  pl: string;
  plPositive: boolean;
}

export interface StrategyPool {
  id: string;
  name: string;
  allocation: number;
  pool: string;
  tag: string;
  tagColor: "gold" | "slate" | "dark";
  barColor: string;
}

export interface LiveMetric {
  label: string;
  value: string;
  icon: "trending" | "bolt" | "bank" | "warning";
  iconBg: string;
  iconColor: string;
}

export interface LiveSessionStats {
  balance: number;
  equity: number;
  floatingPl: number;
  // False until per-position notional/lot size is tracked (Phase 11
  // follow-up) — the UI shows "—" instead of a misleading "$0.00".
  floatingPlKnown: boolean;
}

export interface LivePerformanceData {
  liveVolume: string;
  totalLiquidity: string;
  chartPoints: { x: number; y: number }[];
  chartRange: { min: number; max: number };
  timeLabels: string[];
  session: LiveSessionStats;
  executions: ActiveExecution[];
  strategyPools: StrategyPool[];
  metrics: LiveMetric[];
}
