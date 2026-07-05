import { NextResponse } from "next/server";

// This route was the original unauthenticated email-link handler — a single
// GET with ?action=approve|reject&userId=... would approve or reject a deposit
// without any authentication, protected only by the unguessability of the UUID.
//
// Phase 13 replaces it with authenticated POST routes:
//   POST /api/admin/deposits/[id]/approve  (super_admin only)
//   POST /api/admin/deposits/[id]/reject   (super_admin only)
//
// This stub remains so that old approval-link emails that were already sent
// don't return a confusing 404. Visiting such a link now redirects the admin
// to the deposit review page where they must be logged in to take any action.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting — Aurum Sovereign Capital</title>
  <meta http-equiv="refresh" content="3;url=/login?redirect=/admin/deposits" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;width:100%;margin:40px 16px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
    <div style="height:4px;background:linear-gradient(90deg,#C5A059,#e8c878,#C5A059);"></div>
    <div style="padding:36px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#92744a;">Aurum Sovereign Capital</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">Action Required</h1>
      <div style="padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#92400e;font-weight:500;">
          Deposit decisions are now reviewed through the secure admin portal.<br/>
          Please log in to the admin dashboard to approve or reject this request.
        </p>
      </div>
      <p style="margin:20px 0 0;font-size:13px;color:#64748b;">Redirecting you to the login page in a moment…</p>
    </div>
  </div>
</body>
</html>`;

  // Log the access attempt (userId from the old link, if present, for audit)
  if (userId) {
    console.info("[deposit-decision] Legacy email link accessed for userId:", userId, "— redirecting to portal.");
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
    },
  });
}
