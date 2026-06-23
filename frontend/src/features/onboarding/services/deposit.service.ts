import type {
  DepositSession,
  LoginApiResponse,
  RegisterApiResponse,
  RegistrationApiPayload,
} from "@/src/features/onboarding/types/deposit.types";
import type { LoginPayload } from "@/src/types/auth.types";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload;
}

export async function registerViaApi(
  payload: RegistrationApiPayload
): Promise<RegisterApiResponse> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<RegisterApiResponse>(response);
}

export async function loginViaApi(
  payload: LoginPayload
): Promise<LoginApiResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<LoginApiResponse>(response);
}

export async function fetchDepositSession(): Promise<DepositSession | null> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
    },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.session as DepositSession) ?? null;
}

export async function submitProofViaApi(
  formData: FormData
): Promise<{ depositStatus: DepositSession["depositStatus"] }> {
  const response = await fetch("/api/onboarding/deposit-proof", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    depositStatus?: DepositSession["depositStatus"];
    error?: string;
  };

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error("File is too large. Maximum upload size is 10 MB.");
    }
    throw new Error(payload.error ?? "Submission failed.");
  }

  return { depositStatus: payload.depositStatus ?? "pending" };
}

export async function simulateAdminAction(
  action: "approve" | "reject"
): Promise<{ depositStatus: DepositSession["depositStatus"] }> {
  const response = await fetch("/api/auth/admin-simulation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  return parseJson<{ depositStatus: DepositSession["depositStatus"] }>(response);
}
