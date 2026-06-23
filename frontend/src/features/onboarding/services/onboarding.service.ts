import { register as registerApi } from "@/src/services/api/auth.api";
import type { RegistrationPayload, RegistrationResult } from "@/src/types/auth.types";
import type { RegistrationData } from "@/src/app/(public)/onboarding/_types/registration";

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
): Promise<RegistrationResult> {
  return registerApi(toRegistrationPayload(data));
}
