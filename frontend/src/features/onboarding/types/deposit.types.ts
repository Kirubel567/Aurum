import type { AuthSession, RegistrationPayload } from "@/src/types/auth.types";

export type DepositStatus = "none" | "pending" | "approved" | "rejected";

export interface BankCoordinates {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  referenceCode: string;
  currency: string;
  instructions: string;
}

export interface StoredDepositUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  username: string;
  phoneNumber: string;
  country: string;
  role: "investor" | "admin";
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpiresAt?: string;
  depositStatus: DepositStatus;
  intendedDepositAmount?: number;
  proofFileName?: string;
  proofMimeType?: string;
  proofBase64?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepositSession extends AuthSession {
  depositStatus: DepositStatus;
  emailVerified: boolean;
}

export interface RegisterApiResponse {
  session: DepositSession;
  userId: string;
}

export interface LoginApiResponse {
  session: DepositSession;
}

export interface SubmitProofResult {
  depositStatus: DepositStatus;
}

export type RegistrationApiPayload = RegistrationPayload;
