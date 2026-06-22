import { simulateRequest } from "./client";
import type {
  AdminUserRecord,
  InvestorContext,
  ProfileUpdatePayload,
  UserFilter,
  UserProfile,
} from "@/src/types/user.types";

const MOCK_PROFILE: UserProfile = {
  id: "usr_inv_001",
  email: "investor@aurum.capital",
  name: "Alexander Mercer",
  phone: "+1 212 555 0142",
  country: "United States",
  timezone: "America/New_York",
  avatarUrl: "/avatars/investor.jpg",
  kycStatus: "verified",
};

const MOCK_USERS: AdminUserRecord[] = [
  {
    id: "usr_001",
    name: "Alexander Mercer",
    email: "investor@aurum.capital",
    role: "investor",
    status: "active",
    managerId: "mgr_001",
    managerName: "Sarah Chen",
    aum: 2450000,
    joinedAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "usr_002",
    name: "Victoria Ashford",
    email: "v.ashford@mail.com",
    role: "investor",
    status: "active",
    managerId: "mgr_001",
    managerName: "Sarah Chen",
    aum: 1820000,
    joinedAt: "2024-05-22T14:30:00Z",
  },
  {
    id: "usr_003",
    name: "James Whitmore",
    email: "j.whitmore@corp.io",
    role: "investor",
    status: "pending",
    aum: 0,
    joinedAt: "2025-01-08T09:15:00Z",
  },
  {
    id: "usr_004",
    name: "Elena Voss",
    email: "admin@aurum.capital",
    role: "admin",
    status: "active",
    aum: 0,
    joinedAt: "2023-11-01T08:00:00Z",
  },
  {
    id: "usr_005",
    name: "Marcus Reid",
    email: "m.reid@finance.com",
    role: "investor",
    status: "active",
    managerId: "mgr_002",
    managerName: "David Park",
    aum: 3100000,
    joinedAt: "2024-01-18T11:45:00Z",
  },
  {
    id: "usr_006",
    name: "Sophia Laurent",
    email: "s.laurent@wealth.fr",
    role: "investor",
    status: "suspended",
    managerId: "mgr_002",
    managerName: "David Park",
    aum: 890000,
    joinedAt: "2024-07-03T16:20:00Z",
  },
  {
    id: "usr_007",
    name: "Robert Kane",
    email: "r.kane@invest.net",
    role: "investor",
    status: "active",
    managerId: "mgr_001",
    managerName: "Sarah Chen",
    aum: 1560000,
    joinedAt: "2024-09-12T13:00:00Z",
  },
  {
    id: "usr_008",
    name: "Isabella Cruz",
    email: "i.cruz@capital.mx",
    role: "investor",
    status: "active",
    aum: 720000,
    joinedAt: "2024-11-28T10:30:00Z",
  },
  {
    id: "usr_009",
    name: "Thomas Berg",
    email: "t.berg@swiss.ch",
    role: "investor",
    status: "active",
    managerId: "mgr_003",
    managerName: "Anna Kowalski",
    aum: 4200000,
    joinedAt: "2023-08-14T07:00:00Z",
  },
  {
    id: "usr_010",
    name: "Nina Patel",
    email: "n.patel@global.in",
    role: "investor",
    status: "pending",
    aum: 0,
    joinedAt: "2025-02-01T12:00:00Z",
  },
  {
    id: "usr_011",
    name: "Oliver Grant",
    email: "o.grant@uk.co",
    role: "investor",
    status: "active",
    managerId: "mgr_003",
    managerName: "Anna Kowalski",
    aum: 980000,
    joinedAt: "2024-06-19T15:45:00Z",
  },
  {
    id: "usr_012",
    name: "Sarah Chen",
    email: "s.chen@aurum.capital",
    role: "admin",
    status: "active",
    aum: 0,
    joinedAt: "2023-06-01T08:00:00Z",
  },
];

const MOCK_INVESTOR_CONTEXT: InvestorContext = {
  userId: "usr_001",
  name: "Alexander Mercer",
  email: "investor@aurum.capital",
  aum: 2450000,
  availableBalance: 185000,
  openPositions: 4,
  kycStatus: "verified",
  assignedManager: "Sarah Chen",
};

export async function getProfile(): Promise<UserProfile> {
  return simulateRequest({ ...MOCK_PROFILE }, 250);
}

export async function updateProfile(
  payload: ProfileUpdatePayload
): Promise<UserProfile> {
  const updated = { ...MOCK_PROFILE, ...payload };
  return simulateRequest(updated, 350);
}

export async function getUsers(filter?: UserFilter): Promise<AdminUserRecord[]> {
  let results = [...MOCK_USERS];
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }
  if (filter?.role) {
    results = results.filter((u) => u.role === filter.role);
  }
  if (filter?.status) {
    results = results.filter((u) => u.status === filter.status);
  }
  return simulateRequest(results, 300);
}

export async function getInvestorContext(
  userId: string
): Promise<InvestorContext> {
  const context = { ...MOCK_INVESTOR_CONTEXT, userId };
  return simulateRequest(context, 280);
}

export async function updateUserRole(
  userId: string,
  role: AdminUserRecord["role"]
): Promise<AdminUserRecord> {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  return simulateRequest({ ...user, role }, 300);
}

export async function assignManager(
  userId: string,
  managerId: string,
  managerName: string
): Promise<AdminUserRecord> {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  return simulateRequest({ ...user, managerId, managerName }, 300);
}
