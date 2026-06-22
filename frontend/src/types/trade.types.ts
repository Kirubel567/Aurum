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
