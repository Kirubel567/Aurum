export type UserRole = "investor" | "admin";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegistrationPayload {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  country: string;
  dateOfBirth: string;
  referralCode?: string;
  streetAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  password: string;
  twoFactorEnabled: boolean;
}

export interface RegistrationResult {
  session: AuthSession;
  userId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: string;
}
