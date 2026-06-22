import { simulateRequest } from "./client";
import type {
  PerformancePoint,
  WalletLedger,
  WalletSummary,
  WithdrawalRequest,
  WithdrawalResult,
} from "@/src/types/wallet.types";

const MOCK_SUMMARY: WalletSummary = {
  totalBalance: 2450000,
  availableBalance: 185000,
  pendingBalance: 42000,
  withdrawnTotal: 320000,
  currency: "USD",
};

const MOCK_LEDGER_ENTRIES: WalletLedger["entries"] = [
  {
    id: "led_001",
    type: "deposit",
    amount: 500000,
    status: "completed",
    description: "Wire transfer — Chase Bank",
    createdAt: "2025-01-15T10:30:00Z",
  },
  {
    id: "led_002",
    type: "trade",
    amount: -125000,
    status: "completed",
    description: "BTC/USD Long position opened",
    createdAt: "2025-01-18T14:22:00Z",
  },
  {
    id: "led_003",
    type: "deposit",
    amount: 250000,
    status: "completed",
    description: "Crypto deposit — USDT",
    createdAt: "2025-02-01T09:15:00Z",
  },
  {
    id: "led_004",
    type: "withdrawal",
    amount: -75000,
    status: "completed",
    description: "Withdrawal to personal account",
    createdAt: "2025-02-10T16:45:00Z",
  },
  {
    id: "led_005",
    type: "trade",
    amount: 89000,
    status: "completed",
    description: "ETH/USD position closed — profit",
    createdAt: "2025-02-14T11:00:00Z",
  },
  {
    id: "led_006",
    type: "fee",
    amount: -2500,
    status: "completed",
    description: "Monthly management fee",
    createdAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "led_007",
    type: "deposit",
    amount: 100000,
    status: "pending",
    description: "Bank transfer — pending verification",
    createdAt: "2025-03-18T08:30:00Z",
  },
  {
    id: "led_008",
    type: "withdrawal",
    amount: -50000,
    status: "pending",
    description: "Withdrawal request — under review",
    createdAt: "2025-03-20T13:20:00Z",
  },
];

const MOCK_PERFORMANCE: PerformancePoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split("T")[0],
    value: 2200000 + Math.sin(i / 4) * 150000 + i * 8000,
  };
});

export async function getSummary(): Promise<WalletSummary> {
  return simulateRequest({ ...MOCK_SUMMARY }, 250);
}

export async function getLedger(): Promise<WalletLedger> {
  return simulateRequest(
    { entries: MOCK_LEDGER_ENTRIES, total: MOCK_LEDGER_ENTRIES.length },
    300
  );
}

export async function getPerformanceHistory(): Promise<PerformancePoint[]> {
  return simulateRequest([...MOCK_PERFORMANCE], 280);
}

export async function requestWithdrawal(
  payload: WithdrawalRequest
): Promise<WithdrawalResult> {
  const result: WithdrawalResult = {
    id: `wdr_${Date.now()}`,
    status: "pending",
    amount: payload.amount,
    createdAt: new Date().toISOString(),
  };
  return simulateRequest(result, 400);
}
