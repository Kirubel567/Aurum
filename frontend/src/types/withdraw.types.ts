export type WithdrawMethod = "standard" | "express";
export type WithdrawStatus = "pending" | "processing" | "approved" | "completed" | "rejected";

export interface SavedBankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  swiftCode?: string;
  isPrimary: boolean;
}

export interface WithdrawHistoryItem {
  id: string;
  date: string;
  amount: number;
  fee: number;
  netAmount: number;
  destination: string;
  bankName: string;
  method: WithdrawMethod;
  status: WithdrawStatus;
  reference: string;
  estimatedArrival: string;
}

export interface WithdrawBalanceSummary {
  totalBalance: number;
  availableToWithdraw: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
  lockedUntil: string | null;
  withdrawnThisMonth: number;
  monthlyLimit: number;
  dailyLimit: number;
  dailyUsed: number;
}

export interface WithdrawFormState {
  amount: string;
  bankId: string;
  method: WithdrawMethod;
  note: string;
}
