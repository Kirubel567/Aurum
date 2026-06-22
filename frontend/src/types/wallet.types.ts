export interface WalletSummary {
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  withdrawnTotal: number;
  currency: string;
}

export interface LedgerEntry {
  id: string;
  type: "deposit" | "withdrawal" | "trade" | "fee";
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  createdAt: string;
}

export interface WalletLedger {
  entries: LedgerEntry[];
  total: number;
}

export interface WithdrawalRequest {
  amount: number;
  method: "bank" | "crypto";
  destination: string;
}

export interface WithdrawalResult {
  id: string;
  status: "pending" | "approved" | "rejected";
  amount: number;
  createdAt: string;
}

export interface PerformancePoint {
  date: string;
  value: number;
}
