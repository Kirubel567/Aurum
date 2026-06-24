import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { MAX_PROOF_FILE_BYTES } from "@/src/features/onboarding/lib/deposit-limits";
import { processDepositProofSubmission } from "@/src/features/onboarding/lib/submit-proof";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await getDepositSessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PROOF_FILE_BYTES + 512_000) {
      return NextResponse.json(
        { error: "File size must be under 10 MB." },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const proof = formData.get("proof");

    if (!(proof instanceof File)) {
      return NextResponse.json(
        { error: "A valid proof document is required." },
        { status: 400 }
      );
    }

    const result = await processDepositProofSubmission(
      proof,
      session,
      formData.get("depositAmount")?.toString()
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Submission failed.";

    if (message.toLowerCase().includes("under 10 mb")) {
      return NextResponse.json({ error: message }, { status: 413 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
