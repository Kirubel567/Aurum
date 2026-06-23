export const MAX_PROOF_FILE_BYTES = 10 * 1024 * 1024;

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
