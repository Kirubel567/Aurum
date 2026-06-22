export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidAmount(value: number, min = 0): boolean {
  return !isNaN(value) && value >= min;
}

export const ACCEPTED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function isAcceptedProofFile(file: File): boolean {
  return (ACCEPTED_PROOF_TYPES as readonly string[]).includes(file.type);
}
