import { simulateRequest } from "./client";
import type { AuthSession, LoginPayload } from "@/src/types/auth.types";

const MOCK_INVESTOR_SESSION: AuthSession = {
  user: {
    id: "usr_inv_001",
    email: "investor@aurum.capital",
    name: "Alexander Mercer",
    role: "investor",
    avatarUrl: "/avatars/investor.jpg",
  },
  accessToken: "mock_token_investor",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

const MOCK_ADMIN_SESSION: AuthSession = {
  user: {
    id: "usr_adm_001",
    email: "admin@aurum.capital",
    name: "Elena Voss",
    role: "admin",
    avatarUrl: "/avatars/admin.jpg",
  },
  accessToken: "mock_token_admin",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

let currentSession: AuthSession | null = MOCK_INVESTOR_SESSION;

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const session =
    payload.email.includes("admin") ? MOCK_ADMIN_SESSION : MOCK_INVESTOR_SESSION;
  currentSession = session;
  return simulateRequest(session, 400);
}

export async function logout(): Promise<void> {
  currentSession = null;
  return simulateRequest(undefined as void, 200);
}

export async function getSession(): Promise<AuthSession | null> {
  return simulateRequest(currentSession, 150);
}

export async function refreshToken(): Promise<AuthSession> {
  if (!currentSession) {
    throw new Error("No active session");
  }
  const refreshed: AuthSession = {
    ...currentSession,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  currentSession = refreshed;
  return simulateRequest(refreshed, 250);
}
