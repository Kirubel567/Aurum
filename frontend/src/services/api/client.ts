import type { ApiError } from "@/src/types/api.types";
import { mockDelay } from "@/src/lib/utils/delay";

export function createApiError(code: string, message: string): ApiError {
  return { code, message };
}

export async function simulateRequest<T>(data: T, delayMs = 300): Promise<T> {
  await mockDelay(delayMs);
  return data;
}

export async function simulateRequestWithError<T>(
  data: T,
  shouldFail: boolean,
  error: ApiError,
  delayMs = 300
): Promise<T> {
  await mockDelay(delayMs);
  if (shouldFail) {
    throw error;
  }
  return data;
}
