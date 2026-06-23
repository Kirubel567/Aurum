import type { UserRole } from "./auth.types";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  investorId?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  avatarUrl?: string;
  kycStatus: "pending" | "verified" | "rejected";
}

export interface ProfileUpdatePayload {
  name?: string;
  phone?: string;
  country?: string;
  timezone?: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended" | "pending";
  managerId?: string;
  managerName?: string;
  aum: number;
  joinedAt: string;
}

export interface UserFilter {
  search?: string;
  role?: UserRole;
  status?: AdminUserRecord["status"];
}

export interface InvestorContext {
  userId: string;
  name: string;
  email: string;
  aum: number;
  availableBalance: number;
  openPositions: number;
  kycStatus: UserProfile["kycStatus"];
  assignedManager?: string;
}
