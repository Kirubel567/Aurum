import { z } from "zod";

export const personalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Enter a valid email address"),
  phoneNumber: z.string().min(7, "Enter a valid phone number"),
  phoneCountryCode: z.string().min(2),
  country: z.string().min(1, "Select your country"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  referralCode: z.string().optional(),
});

export const contactInfoSchema = z.object({
  streetAddress: z.string().min(3, "Street address is required"),
  city: z.string().min(2, "City is required"),
  stateProvince: z.string().min(2, "State or province is required"),
  postalCode: z.string().min(3, "Postal code is required"),
});

export const securitySchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    twoFactorEnabled: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type ContactInfoValues = z.infer<typeof contactInfoSchema>;
export type SecurityValues = z.infer<typeof securitySchema>;
