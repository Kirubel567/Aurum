export type RegistrationStep = 1 | 2 | 3;

export interface RegistrationData {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  phoneCountryCode: string;
  country: string;
  dateOfBirth: string;
  referralCode: string;
  streetAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
  twoFactorEnabled: boolean;
}

export const INITIAL_REGISTRATION_DATA: RegistrationData = {
  fullName: "",
  username: "",
  email: "",
  phoneNumber: "",
  phoneCountryCode: "+251",
  country: "",
  dateOfBirth: "",
  referralCode: "",
  streetAddress: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  password: "",
  confirmPassword: "",
  twoFactorEnabled: false,
};

export type RegistrationField = keyof RegistrationData;

export interface StepConfig {
  id: RegistrationStep;
  label: string;
}

export const REGISTRATION_STEPS: StepConfig[] = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Contact Info" },
  { id: 3, label: "Security" },
];
