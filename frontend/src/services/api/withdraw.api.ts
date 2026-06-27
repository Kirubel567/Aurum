import type {
  SavedBankAccount,
  WithdrawBalanceSummary,
  WithdrawHistoryItem,
} from "@/src/types/withdraw.types";

export const MOCK_BANKS: SavedBankAccount[] = [
  {
    id: "cbe",
    bankName: "Commercial Bank of Ethiopia",
    accountHolder: "Abebe Kebede",
    accountNumber: "1000 5497 1250 2",
    swiftCode: "CBETETAA",
    isPrimary: true,
  },
  {
    id: "boa",
    bankName: "Bank of Abyssinia",
    accountHolder: "Abebe Kebede",
    accountNumber: "162 435 388",
    swiftCode: "ABYSETAA",
    isPrimary: false,
  },
];

export const MOCK_BALANCE: WithdrawBalanceSummary = {
  totalBalance: 12450.0,
  availableToWithdraw: 8200.0,
  pendingWithdrawals: 0,
  totalWithdrawn: 4250.0,
  lockedUntil: null,
  withdrawnThisMonth: 0,
  monthlyLimit: 50000,
  dailyLimit: 10000,
  dailyUsed: 0,
};

export const MOCK_HISTORY: WithdrawHistoryItem[] = [
  {
    id: "WD-2025-001",
    date: "May 12, 2025",
    amount: 2500,
    fee: 12.5,
    netAmount: 2487.5,
    destination: "1000 5497 1250 2",
    bankName: "Commercial Bank of Ethiopia",
    method: "standard",
    status: "completed",
    reference: "REF-48291",
    estimatedArrival: "May 15, 2025",
  },
  {
    id: "WD-2025-002",
    date: "Apr 28, 2025",
    amount: 1750,
    fee: 17.5,
    netAmount: 1732.5,
    destination: "162 435 388",
    bankName: "Bank of Abyssinia",
    method: "express",
    status: "completed",
    reference: "REF-37104",
    estimatedArrival: "Apr 29, 2025",
  },
];

export const FEE_RATE = { standard: 0.005, express: 0.01 };
export const MIN_WITHDRAW = 500;
export const PROCESSING_DAYS = { standard: "1–3 business days", express: "Within 24 hours" };

export async function getWithdrawData() {
  await new Promise((r) => setTimeout(r, 400));
  return { balance: MOCK_BALANCE, banks: MOCK_BANKS, history: MOCK_HISTORY };
}

export async function submitWithdrawal(_payload: {
  amount: number;
  bankId: string;
  method: string;
  note: string;
}): Promise<{ id: string; reference: string }> {
  await new Promise((r) => setTimeout(r, 1400));
  return {
    id: `WD-${Date.now()}`,
    reference: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
  };
}
