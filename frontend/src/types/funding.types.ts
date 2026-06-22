export interface DepositMethod {
  id: string;
  name: string;
  type: "bank" | "crypto" | "ewallet";
  description: string;
  minAmount: number;
  processingTime: string;
  icon: string;
}

export interface DepositRequest {
  methodId: string;
  amount: number;
  proofUrl?: string;
  reference?: string;
}

export interface DepositRequestResult {
  id: string;
  status: "pending" | "approved" | "rejected";
  amount: number;
  method: string;
  createdAt: string;
}

export interface PendingDeposit {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  proofUrl: string;
  reference: string;
  status: "pending" | "under_review";
  submittedAt: string;
}

export interface DepositVerification {
  depositId: string;
  approved: boolean;
  notes?: string;
}

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
}
