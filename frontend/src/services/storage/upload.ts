import { mockDelay } from "@/src/lib/utils/delay";
import type { UploadResult } from "@/src/types/funding.types";

export async function uploadProof(file: File): Promise<UploadResult> {
  await mockDelay(800);
  return {
    url: `/uploads/${file.name}`,
    fileName: file.name,
    fileSize: file.size,
  };
}
