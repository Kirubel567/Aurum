"use client";

import {
  AtSign,
  Calendar,
  Globe,
  Mail,
  Ticket,
  User,
} from "lucide-react";

import {
  COUNTRY_OPTIONS,
  PHONE_COUNTRY_CODES,
} from "@/src/lib/constants/countries";
import type { RegistrationData } from "../../_types/registration";
import { FieldLabel, IconInput, IconSelect } from "../IconField";

interface PersonalInfoStepProps {
  data: RegistrationData;
  errors: Partial<Record<keyof RegistrationData, string>>;
  onChange: (field: keyof RegistrationData, value: string | boolean) => void;
}

export function PersonalInfoStep({
  data,
  errors,
  onChange,
}: PersonalInfoStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>Full Name</FieldLabel>
          <IconInput
            icon={<User className="size-4" />}
            placeholder="Enter your full name"
            value={data.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            error={errors.fullName}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel required>Username</FieldLabel>
          <IconInput
            icon={<AtSign className="size-4" />}
            placeholder="Choose a username"
            value={data.username}
            onChange={(e) => onChange("username", e.target.value)}
            error={errors.username}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>Email Address</FieldLabel>
          <IconInput
            type="email"
            icon={<Mail className="size-4" />}
            placeholder="Enter your email address"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            error={errors.email}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel required>Phone Number</FieldLabel>
          <div className="flex">
            <div className="relative">
              <select
                value={data.phoneCountryCode}
                onChange={(e) => onChange("phoneCountryCode", e.target.value)}
                className="flex h-12 items-center gap-2 rounded-l-xl border border-r-0 border-slate-200 bg-white px-3 text-sm font-semibold text-[#050B14] outline-none focus:border-[#e9c349] focus:ring-2 focus:ring-[#e9c349]/20"
              >
                {PHONE_COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={data.phoneNumber}
              onChange={(e) => onChange("phoneNumber", e.target.value)}
              className="h-12 w-full rounded-r-xl border border-slate-200 bg-white px-4 text-sm text-[#050B14] outline-none transition-all placeholder:text-slate-400 focus:border-[#e9c349] focus:ring-2 focus:ring-[#e9c349]/20"
            />
          </div>
          {errors.phoneNumber && (
            <p className="text-xs text-[#EF4444]">{errors.phoneNumber}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>Country</FieldLabel>
          <IconSelect
            icon={<Globe className="size-4" />}
            value={data.country}
            onChange={(e) => onChange("country", e.target.value)}
            error={errors.country}
          >
            <option value="">Select your country</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </IconSelect>
        </div>
        <div className="space-y-2">
          <FieldLabel required>Date of Birth</FieldLabel>
          <IconInput
            type="date"
            icon={<Calendar className="size-4" />}
            value={data.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            error={errors.dateOfBirth}
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Referral Code (Optional)</FieldLabel>
        <IconInput
          icon={<Ticket className="size-4" />}
          placeholder="Enter referral code (if you have one)"
          value={data.referralCode}
          onChange={(e) => onChange("referralCode", e.target.value)}
        />
      </div>
    </div>
  );
}
