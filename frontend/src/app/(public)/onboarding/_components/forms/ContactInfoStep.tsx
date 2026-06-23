"use client";

import { Building2, MapPin, MapPinned } from "lucide-react";

import type { RegistrationData } from "../../_types/registration";
import { FieldLabel, IconInput } from "../IconField";

interface ContactInfoStepProps {
  data: RegistrationData;
  errors: Partial<Record<keyof RegistrationData, string>>;
  onChange: (field: keyof RegistrationData, value: string | boolean) => void;
}

export function ContactInfoStep({
  data,
  errors,
  onChange,
}: ContactInfoStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FieldLabel required>Street Address</FieldLabel>
        <IconInput
          icon={<MapPin className="size-5" />}
          placeholder="Enter your street address"
          value={data.streetAddress}
          onChange={(e) => onChange("streetAddress", e.target.value)}
          error={errors.streetAddress}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>City</FieldLabel>
          <IconInput
            icon={<Building2 className="size-5" />}
            placeholder="Enter your city"
            value={data.city}
            onChange={(e) => onChange("city", e.target.value)}
            error={errors.city}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel required>State / Province</FieldLabel>
          <IconInput
            icon={<MapPinned className="size-5" />}
            placeholder="Enter state or province"
            value={data.stateProvince}
            onChange={(e) => onChange("stateProvince", e.target.value)}
            error={errors.stateProvince}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-1">
          <FieldLabel required>Postal / ZIP Code</FieldLabel>
          <IconInput
            icon={<MapPin className="size-5" />}
            placeholder="Enter postal or ZIP code"
            value={data.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value)}
            error={errors.postalCode}
          />
        </div>
      </div>
    </div>
  );
}
