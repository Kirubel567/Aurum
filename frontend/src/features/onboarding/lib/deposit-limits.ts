export const MAX_PROOF_FILE_BYTES = 10 * 1024 * 1024;
export const MIN_DEPOSIT_AMOUNT_USD = 1350;

export const ALLOWED_PROOF_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function formatMaxProofSize(): string {
  return "10 MB";
}

export function validateProofFile(file: File): string | null {
  if (!ALLOWED_PROOF_MIME_TYPES.has(file.type)) {
    return "Only PDF, JPG, PNG, or WEBP files are accepted.";
  }
  if (file.size > MAX_PROOF_FILE_BYTES) {
    return `File size must be under ${formatMaxProofSize()}.`;
  }
  return null;
}

export function validateDepositAmount(value: string): string | null {
  const amount = Number(value);
  if (!value.trim() || Number.isNaN(amount)) {
    return "Please enter a valid deposit amount.";
  }
  if (amount < MIN_DEPOSIT_AMOUNT_USD) {
    return `Minimum deposit amount is $${MIN_DEPOSIT_AMOUNT_USD.toLocaleString()} USD.`;
  }
  return null;
}

export function formatDepositAmountUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
