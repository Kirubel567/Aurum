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

// ── Wallet page types ─────────────────────────────────────────────────────────

export type TxType =
  | "wallet_funding"
  | "deposit"
  | "pending_withdrawal"
  | "withdrawal"
  | "adjustment";

export interface WalletTransaction {
  id: string;
  date: string;
  type: TxType;
  label: string;
  description: string;
  amount: string;
  amountPositive: boolean;
  status: "completed" | "pending" | null;
}

export interface WalletPageData {
  totalBalance: string;
  availableBalance: string;
  currency: string;
  totalDeposited: string;
  totalWithdrawn: string;
  pendingRequests: string;
  infoBannerText: string;
  walletInfo: {
    status: string;
    activatedOn: string;
    walletId: string;
    currency: string;
  };
  transactions: WalletTransaction[];
}
