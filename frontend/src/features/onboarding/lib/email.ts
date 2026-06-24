interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "onboarding@aurum.capital";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@aurum.capital";

export class EmailDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDispatchError";
  }
}

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

function assertResendConfigured(): string {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new EmailConfigurationError(
        "RESEND_API_KEY is required in production. Email dispatch cannot initialize."
      );
    }
    return "";
  }

  return apiKey;
}

async function dispatchEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = assertResendConfigured();

  if (!apiKey) {
    console.info("[deposit-email:dev-fallback]", {
      to: options.to,
      subject: options.subject,
      attachmentCount: options.attachments?.length ?? 0,
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[deposit-email:error]", body);
    throw new EmailDispatchError(
      "Unable to dispatch email. Please contact support."
    );
  }
}

// ── Shared layout shell ───────────────────────────────────────────────────────

function shell(previewText: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aurum Sovereign Capital</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <!-- Preview text (hidden) -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</span>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background-color:#111827;border-radius:16px;border:1px solid rgba(197,160,89,0.2);overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a0e17 0%,#111827 100%);padding:32px 36px 28px;border-bottom:1px solid rgba(197,160,89,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C5A059;">Aurum Sovereign Capital</p>
                    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;">Early Access Programme</p>
                  </td>
                  <td align="right">
                    <div style="width:36px;height:36px;background:linear-gradient(135deg,#C5A059,#a8894a);border-radius:8px;display:inline-block;text-align:center;line-height:36px;font-size:18px;font-weight:800;color:#0a0e17;">A</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">
                You received this email because you registered for the Aurum Sovereign Capital Early Access Programme.
                This is an automated message — please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#f8fafc;line-height:1.3;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:rgba(248,250,252,0.7);">${text}</p>`;
}

function ctaButton(text: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="background:linear-gradient(135deg,#C5A059,#a8894a);border-radius:10px;">
          <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#0a0e17;text-decoration:none;letter-spacing:0.02em;">${text}</a>
        </td>
      </tr>
    </table>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);">${label}</span>
        <p style="margin:4px 0 0;font-size:14px;font-weight:500;color:#f8fafc;">${value}</p>
      </td>
    </tr>`;
}

function infoTable(rows: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background-color:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">
      ${rows}
    </table>`;
}

function notice(text: string, variant: "gold" | "red" | "green" = "gold"): string {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    gold: { bg: "rgba(197,160,89,0.08)", border: "rgba(197,160,89,0.25)", text: "rgba(197,160,89,0.9)" },
    red: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "rgba(239,68,68,0.9)" },
    green: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", text: "rgba(16,185,129,0.9)" },
  };
  const c = colors[variant];
  return `<p style="margin:20px 0 0;padding:14px 16px;background:${c.bg};border:1px solid ${c.border};border-radius:10px;font-size:13px;line-height:1.6;color:${c.text};">${text}</p>`;
}

// ── Email 1: Email Verification ───────────────────────────────────────────────

export async function sendEmailVerificationEmail(
  investorEmail: string,
  investorName: string,
  verificationUrl: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Confirm your email — Aurum Sovereign Capital",
    html: shell(
      "One step away — confirm your email to access your deposit instructions.",
      `
      ${h1("Verify Your Email Address")}
      ${p(`Welcome, <strong style="color:#f8fafc;">${investorName}</strong>. Your registration has been received.`)}
      ${p("To access your sovereign deposit instructions and complete your early-stage capital allocation, please confirm your email address by clicking the button below.")}
      ${ctaButton("Confirm Email Address", verificationUrl)}
      ${p("This verification link expires in <strong style=\"color:#f8fafc;\">24 hours</strong>. If you did not register for Aurum Sovereign Capital, you can safely disregard this message.")}
      ${notice("For security, never share this link with anyone. Aurum Sovereign Capital will never ask for your password.")}
    `
    ),
  });
}

// ── Email 2: Email Confirmed ──────────────────────────────────────────────────

export async function sendEmailConfirmedEmail(
  investorEmail: string,
  investorName: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Email confirmed — proceed with your deposit",
    html: shell(
      "Your email is verified. Proceed with your capital deposit.",
      `
      ${h1("Email Successfully Confirmed")}
      ${p(`Your email address has been verified, <strong style="color:#f8fafc;">${investorName}</strong>.`)}
      ${p("You can now sign in to view your sovereign deposit instructions, select your preferred banking institution, and submit your payment proof for audit verification.")}
      ${infoTable(
        infoRow("Next Step", "Sign in and initiate your bank transfer") +
        infoRow("Minimum Deposit", "USD 1,200") +
        infoRow("Verification Timeline", "Within 24–48 hours of receipt submission")
      )}
      ${notice("The platform launch date will be communicated to all verified investors via email before trading begins.")}
    `
    ),
  });
}

// ── Email 3: Investor Proof Received ─────────────────────────────────────────

export async function sendInvestorProofReceivedEmail(
  investorEmail: string,
  investorName: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Deposit proof received — under sovereign review",
    html: shell(
      "We have received your deposit receipt and it is now under review.",
      `
      ${h1("Deposit Proof Received")}
      ${p(`Thank you, <strong style="color:#f8fafc;">${investorName}</strong>. Your payment receipt has been successfully submitted to our sovereign audit desk.`)}
      ${p("Our team is currently reviewing your transfer documentation. You will receive an email confirmation immediately upon approval.")}
      ${infoTable(
        infoRow("Status", "Under Review") +
        infoRow("Expected Review Time", "24–48 hours") +
        infoRow("Notification Method", "Email")
      )}
      ${p("Please ensure the email address associated with your account remains active. No further action is required from you at this time.")}
      ${notice("Once approved, your early-stage capital allocation will be officially secured. The platform launch date will be announced via email before trading begins.", "gold")}
    `
    ),
  });
}

// ── Email 4: Admin Proof Notification ────────────────────────────────────────

export async function sendAdminProofNotificationEmail(params: {
  investorEmail: string;
  investorName: string;
  username: string;
  phoneNumber: string;
  country: string;
  intendedDepositAmount: number;
  proofFileName: string;
  proofBase64: string;
  proofMimeType: string;
}): Promise<void> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(params.intendedDepositAmount);

  await dispatchEmail({
    to: ADMIN_EMAIL,
    subject: `[Action Required] New deposit proof — ${params.investorName}`,
    html: shell(
      `${params.investorName} has submitted a deposit receipt for ${formattedAmount}. Review required.`,
      `
      ${h1("New Deposit Proof Submission")}
      ${p("An investor has submitted a payment receipt for sovereign audit verification. The receipt is attached to this email. Review and approve or reject from the admin panel.")}
      ${infoTable(
        infoRow("Investor Name", params.investorName) +
        infoRow("Email Address", params.investorEmail) +
        infoRow("Username", params.username) +
        infoRow("Phone Number", params.phoneNumber) +
        infoRow("Country", params.country) +
        infoRow("Intended Deposit Amount", formattedAmount) +
        infoRow("Proof File", `${params.proofFileName} (${params.proofMimeType})`) +
        infoRow("Submitted", new Date().toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa", dateStyle: "full", timeStyle: "short" }))
      )}
      ${notice("The proof receipt is attached to this email as an image/PDF. Retain this message as the authoritative audit record for this submission.", "gold")}
    `
    ),
    attachments: [
      {
        filename: params.proofFileName,
        content: params.proofBase64,
      },
    ],
  });
}

// ── Email 5: Investor Approved ────────────────────────────────────────────────

export async function sendInvestorApprovalEmail(
  investorEmail: string,
  investorName: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Allocation secured — deposit verified",
    html: shell(
      "Your deposit has been verified. Your early-stage allocation is officially secured.",
      `
      ${h1("Your Allocation Is Secured")}
      ${p(`Congratulations, <strong style="color:#f8fafc;">${investorName}</strong>. Your bank transfer receipt has been successfully audited and approved by our sovereign verification desk.`)}
      ${p("Your early-stage capital allocation in Aurum Sovereign Capital is now officially secured.")}
      ${infoTable(
        infoRow("Verification Status", "✓ Approved") +
        infoRow("Allocation Status", "Secured — Early Access") +
        infoRow("Platform Status", "Pre-launch")
      )}
      ${p("The Aurum trading terminal is currently completing final pre-launch configurations. You will receive a direct email notification the moment the platform opens for live capital execution. No further action is needed.")}
      ${notice("Keep this email as your official confirmation of participation in the Aurum Sovereign Capital Early Access Programme.", "green")}
    `
    ),
  });
}

// ── Email 6: Investor Rejected ────────────────────────────────────────────────

export async function sendInvestorRejectionEmail(
  investorEmail: string,
  investorName: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Deposit proof requires resubmission",
    html: shell(
      "We could not verify your payment document. Please resubmit a valid receipt.",
      `
      ${h1("Document Verification Unsuccessful")}
      ${p(`Dear <strong style="color:#f8fafc;">${investorName}</strong>, we were unable to verify the payment document you submitted.`)}
      ${p("This may be due to one of the following reasons:")}
      <ul style="margin:0 0 16px;padding-left:20px;color:rgba(248,250,252,0.7);font-size:15px;line-height:2;">
        <li>The document is blurry or partially cut off</li>
        <li>The transfer amount or account details are not visible</li>
        <li>The document does not appear to be an official bank receipt</li>
        <li>The transfer details do not match our records</li>
      </ul>
      ${p("Please sign in to your account and upload a clear, official bank transfer receipt to continue.")}
      ${notice("If you believe this is an error or require assistance, please contact our support team by replying to this email.", "red")}
    `
    ),
  });
}
