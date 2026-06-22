import { simulateRequest } from "./client";
import type {
  DepositMethod,
  DepositRequest,
  DepositRequestResult,
  DepositVerification,
  PendingDeposit,
} from "@/src/types/funding.types";

const MOCK_METHODS: DepositMethod[] = [
  {
    id: "mth_bank",
    name: "Bank Transfer",
    type: "bank",
    description: "SWIFT/Wire transfer to our institutional account",
    minAmount: 10000,
    processingTime: "1-3 business days",
    icon: "building",
  },
  {
    id: "mth_crypto",
    name: "Cryptocurrency",
    type: "crypto",
    description: "BTC, ETH, USDT accepted on approved networks",
    minAmount: 5000,
    processingTime: "10-60 minutes",
    icon: "bitcoin",
  },
  {
    id: "mth_ewallet",
    name: "E-Wallet",
    type: "ewallet",
    description: "PayPal, Wise, and approved digital wallets",
    minAmount: 1000,
    processingTime: "Same day",
    icon: "wallet",
  },
];

const MOCK_PENDING: PendingDeposit[] = [
  {
    id: "dep_001",
    userId: "usr_003",
    userName: "James Whitmore",
    amount: 150000,
    method: "Bank Transfer",
    proofUrl: "/proofs/dep_001.pdf",
    reference: "WT-2025-0318-001",
    status: "pending",
    submittedAt: "2025-03-18T10:00:00Z",
  },
  {
    id: "dep_002",
    userId: "usr_008",
    userName: "Isabella Cruz",
    amount: 75000,
    method: "Cryptocurrency",
    proofUrl: "/proofs/dep_002.png",
    reference: "TX-0x8f3a...b21c",
    status: "under_review",
    submittedAt: "2025-03-19T14:30:00Z",
  },
  {
    id: "dep_003",
    userId: "usr_010",
    userName: "Nina Patel",
    amount: 200000,
    method: "Bank Transfer",
    proofUrl: "/proofs/dep_003.pdf",
    reference: "WT-2025-0320-003",
    status: "pending",
    submittedAt: "2025-03-20T09:15:00Z",
  },
  {
    id: "dep_004",
    userId: "usr_007",
    userName: "Robert Kane",
    amount: 50000,
    method: "E-Wallet",
    proofUrl: "/proofs/dep_004.jpg",
    reference: "PP-88291034",
    status: "pending",
    submittedAt: "2025-03-21T11:45:00Z",
  },
  {
    id: "dep_005",
    userId: "usr_011",
    userName: "Oliver Grant",
    amount: 320000,
    method: "Bank Transfer",
    proofUrl: "/proofs/dep_005.pdf",
    reference: "WT-2025-0321-005",
    status: "under_review",
    submittedAt: "2025-03-21T16:00:00Z",
  },
];

export async function getDepositMethods(): Promise<DepositMethod[]> {
  return simulateRequest([...MOCK_METHODS], 200);
}

export async function createDepositRequest(
  payload: DepositRequest
): Promise<DepositRequestResult> {
  const method = MOCK_METHODS.find((m) => m.id === payload.methodId);
  const result: DepositRequestResult = {
    id: `dep_${Date.now()}`,
    status: "pending",
    amount: payload.amount,
    method: method?.name ?? "Unknown",
    createdAt: new Date().toISOString(),
  };
  return simulateRequest(result, 400);
}

export async function getPendingDeposits(): Promise<PendingDeposit[]> {
  return simulateRequest([...MOCK_PENDING], 300);
}

export async function approveDeposit(
  verification: DepositVerification
): Promise<PendingDeposit> {
  const deposit = MOCK_PENDING.find((d) => d.id === verification.depositId);
  if (!deposit) throw new Error("Deposit not found");
  return simulateRequest({ ...deposit, status: "under_review" }, 350);
}

export async function rejectDeposit(
  verification: DepositVerification
): Promise<PendingDeposit> {
  const deposit = MOCK_PENDING.find((d) => d.id === verification.depositId);
  if (!deposit) throw new Error("Deposit not found");
  return simulateRequest({ ...deposit, status: "pending" }, 350);
}
