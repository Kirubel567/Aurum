import { simulateRequest } from "./client";
import type {
  OrderFilter,
  Position,
  TradeOrder,
} from "@/src/types/trade.types";

// Live Performance's data (executions/pools/metrics/chart) is real —
// see /api/orders/live and useLivePerformance.ts. Everything below this
// line is unrelated mock data still used by other /orders sub-views
// (order history, open positions list) pending their own phases.

const MOCK_ORDERS: TradeOrder[] = [
  {
    id: "ord_001",
    asset: "BTC/USD",
    direction: "buy",
    quantity: 2.5,
    entryPrice: 62400,
    currentPrice: 67850,
    pnl: 13625,
    pnlPercent: 8.73,
    status: "open",
    openedAt: "2025-02-10T09:30:00Z",
  },
  {
    id: "ord_002",
    asset: "ETH/USD",
    direction: "buy",
    quantity: 45,
    entryPrice: 3280,
    currentPrice: 3540,
    pnl: 11700,
    pnlPercent: 7.93,
    status: "open",
    openedAt: "2025-02-15T14:00:00Z",
  },
  {
    id: "ord_003",
    asset: "SOL/USD",
    direction: "sell",
    quantity: 500,
    entryPrice: 142,
    currentPrice: 128,
    pnl: 7000,
    pnlPercent: 9.86,
    status: "open",
    openedAt: "2025-03-01T10:15:00Z",
  },
  {
    id: "ord_004",
    asset: "XAU/USD",
    direction: "buy",
    quantity: 10,
    entryPrice: 2180,
    currentPrice: 2245,
    pnl: 650,
    pnlPercent: 2.98,
    status: "open",
    openedAt: "2025-03-05T08:00:00Z",
  },
  {
    id: "ord_005",
    asset: "AAPL",
    direction: "buy",
    quantity: 200,
    entryPrice: 178.5,
    currentPrice: 192.3,
    pnl: 2760,
    pnlPercent: 7.73,
    status: "closed",
    openedAt: "2025-01-20T11:00:00Z",
    closedAt: "2025-02-28T16:00:00Z",
  },
  {
    id: "ord_006",
    asset: "NVDA",
    direction: "buy",
    quantity: 100,
    entryPrice: 620,
    currentPrice: 875,
    pnl: 25500,
    pnlPercent: 41.13,
    status: "closed",
    openedAt: "2024-12-01T09:00:00Z",
    closedAt: "2025-03-10T15:30:00Z",
  },
  {
    id: "ord_007",
    asset: "EUR/USD",
    direction: "sell",
    quantity: 100000,
    entryPrice: 1.085,
    currentPrice: 1.078,
    pnl: 700,
    pnlPercent: 0.65,
    status: "closed",
    openedAt: "2025-02-20T07:00:00Z",
    closedAt: "2025-03-15T12:00:00Z",
  },
  {
    id: "ord_008",
    asset: "GBP/USD",
    direction: "buy",
    quantity: 50000,
    entryPrice: 1.262,
    currentPrice: 1.271,
    pnl: 450,
    pnlPercent: 0.71,
    status: "closed",
    openedAt: "2025-01-10T10:00:00Z",
    closedAt: "2025-02-05T14:00:00Z",
  },
  {
    id: "ord_009",
    asset: "TSLA",
    direction: "sell",
    quantity: 150,
    entryPrice: 245,
    currentPrice: 238,
    pnl: 1050,
    pnlPercent: 2.86,
    status: "closed",
    openedAt: "2025-02-01T13:00:00Z",
    closedAt: "2025-02-25T11:00:00Z",
  },
  {
    id: "ord_010",
    asset: "MSFT",
    direction: "buy",
    quantity: 80,
    entryPrice: 410,
    currentPrice: 425,
    pnl: 1200,
    pnlPercent: 3.66,
    status: "closed",
    openedAt: "2025-01-05T09:30:00Z",
    closedAt: "2025-03-01T10:00:00Z",
  },
  {
    id: "ord_011",
    asset: "GOOGL",
    direction: "buy",
    quantity: 60,
    entryPrice: 155,
    currentPrice: 168,
    pnl: 780,
    pnlPercent: 8.39,
    status: "closed",
    openedAt: "2024-11-15T10:00:00Z",
    closedAt: "2025-01-30T16:00:00Z",
  },
  {
    id: "ord_012",
    asset: "AMZN",
    direction: "buy",
    quantity: 70,
    entryPrice: 178,
    currentPrice: 195,
    pnl: 1190,
    pnlPercent: 9.55,
    status: "closed",
    openedAt: "2024-12-10T11:00:00Z",
    closedAt: "2025-02-15T14:30:00Z",
  },
  {
    id: "ord_013",
    asset: "META",
    direction: "buy",
    quantity: 40,
    entryPrice: 480,
    currentPrice: 520,
    pnl: 1600,
    pnlPercent: 8.33,
    status: "closed",
    openedAt: "2025-01-08T09:00:00Z",
    closedAt: "2025-03-12T11:00:00Z",
  },
  {
    id: "ord_014",
    asset: "SPY",
    direction: "buy",
    quantity: 300,
    entryPrice: 478,
    currentPrice: 512,
    pnl: 10200,
    pnlPercent: 7.11,
    status: "closed",
    openedAt: "2024-10-01T09:00:00Z",
    closedAt: "2025-03-01T15:00:00Z",
  },
  {
    id: "ord_015",
    asset: "QQQ",
    direction: "buy",
    quantity: 120,
    entryPrice: 395,
    currentPrice: 430,
    pnl: 4200,
    pnlPercent: 8.86,
    status: "cancelled",
    openedAt: "2025-03-18T08:00:00Z",
  },
];

const MOCK_POSITIONS: Position[] = [
  {
    id: "pos_001",
    asset: "BTC/USD",
    direction: "long",
    size: 2.5,
    entryPrice: 62400,
    markPrice: 67850,
    unrealizedPnl: 13625,
    unrealizedPnlPercent: 8.73,
  },
  {
    id: "pos_002",
    asset: "ETH/USD",
    direction: "long",
    size: 45,
    entryPrice: 3280,
    markPrice: 3540,
    unrealizedPnl: 11700,
    unrealizedPnlPercent: 7.93,
  },
  {
    id: "pos_003",
    asset: "SOL/USD",
    direction: "short",
    size: 500,
    entryPrice: 142,
    markPrice: 128,
    unrealizedPnl: 7000,
    unrealizedPnlPercent: 9.86,
  },
  {
    id: "pos_004",
    asset: "XAU/USD",
    direction: "long",
    size: 10,
    entryPrice: 2180,
    markPrice: 2245,
    unrealizedPnl: 650,
    unrealizedPnlPercent: 2.98,
  },
];

export async function getOrders(filter?: OrderFilter): Promise<TradeOrder[]> {
  let results = [...MOCK_ORDERS];
  if (filter?.status) {
    results = results.filter((o) => o.status === filter.status);
  }
  if (filter?.asset) {
    results = results.filter((o) =>
      o.asset.toLowerCase().includes(filter.asset!.toLowerCase())
    );
  }
  if (filter?.direction) {
    results = results.filter((o) => o.direction === filter.direction);
  }
  return simulateRequest(results, 300);
}

export async function getOpenPositions(): Promise<Position[]> {
  return simulateRequest([...MOCK_POSITIONS], 250);
}

export async function getOrderById(id: string): Promise<TradeOrder | null> {
  const order = MOCK_ORDERS.find((o) => o.id === id) ?? null;
  return simulateRequest(order, 200);
}
