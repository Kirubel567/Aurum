import { NextResponse } from "next/server";

import {
  getDepositUserById,
  updateDepositStatus,
} from "@/src/features/onboarding/lib/deposit-store";
import {
  sendInvestorApprovalEmail,
  sendInvestorRejectionEmail,
} from "@/src/features/onboarding/lib/email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");

  if (!userId || (action !== "approve" && action !== "reject")) {
    return new NextResponse(renderPage("Invalid Request", "Missing or invalid parameters.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const user = await getDepositUserById(userId);
  if (!user) {
    return new NextResponse(renderPage("User Not Found", "This investor record could not be found.", false), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (user.depositStatus === "approved" && action === "approve") {
    return new NextResponse(renderPage("Already Approved", `${user.fullName}'s deposit was already approved.`, true), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  await updateDepositStatus(userId, newStatus);

  if (action === "approve") {
    await sendInvestorApprovalEmail(user.email, user.fullName);
    return new NextResponse(
      renderPage(
        "Deposit Approved ✓",
        `${user.fullName} (${user.email}) has been approved. They have been notified via email and their portal is now unlocked.`,
        true
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  await sendInvestorRejectionEmail(user.email, user.fullName);
  return new NextResponse(
    renderPage(
      "Deposit Rejected",
      `${user.fullName} (${user.email}) has been rejected. They have been notified via email to resubmit their receipt.`,
      false
    ),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function renderPage(title: string, message: string, success: boolean): string {
  const accent = success ? "#16a34a" : "#dc2626";
  const bg = success ? "#f0fdf4" : "#fef2f2";
  const border = success ? "#86efac" : "#fca5a5";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Aurum Sovereign Capital</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;width:100%;margin:40px 16px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
    <div style="height:4px;background:linear-gradient(90deg,#C5A059,#e8c878,#C5A059);"></div>
    <div style="padding:36px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#92744a;">Aurum Sovereign Capital</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;">${title}</h1>
      <div style="padding:16px;background:${bg};border:1px solid ${border};border-radius:10px;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:${accent};font-weight:500;">${message}</p>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">You can close this tab.</p>
    </div>
  </div>
</body>
</html>`;
}
