import type { RegistrationData } from "@/src/app/(public)/onboarding/_types/registration";
import { registerViaApi } from "@/src/features/onboarding/services/deposit.service";
import type { RegisterApiResponse } from "@/src/features/onboarding/types/deposit.types";
import type { RegistrationPayload } from "@/src/types/auth.types";

export function toRegistrationPayload(data: RegistrationData): RegistrationPayload {
  return {
    fullName: data.fullName,
    username: data.username,
    email: data.email,
    phoneNumber: `${data.phoneCountryCode}${data.phoneNumber}`,
    country: data.country,
    dateOfBirth: data.dateOfBirth,
    referralCode: data.referralCode || undefined,
    streetAddress: data.streetAddress,
    city: data.city,
    stateProvince: data.stateProvince,
    postalCode: data.postalCode,
    password: data.password,
    twoFactorEnabled: data.twoFactorEnabled,
  };
}

export async function submitRegistration(
  data: RegistrationData
): Promise<RegisterApiResponse> {
  return registerViaApi(toRegistrationPayload(data));
}
