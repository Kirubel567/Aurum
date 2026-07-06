import { resolveAppBaseUrl } from "@/src/features/onboarding/lib/email-verification-token";

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
  process.env.RESEND_FROM_EMAIL ?? "onboarding@aurumsovereigncapital.com";
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "kirubel.wubet1996@gmail.com";

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
        "RESEND_API_KEY is required in production."
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

// ── Shared layout shell (light mode) ─────────────────────────────────────────

function shell(previewText: string, body: string): string {
  const logoUrl = "https://aurumsovereigncapital.com/brand/aurum-icon-gold.png";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aurum Sovereign Capital</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</span>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <img src="${logoUrl}" alt="Aurum Sovereign Capital" width="48" height="48" style="display:block;border-radius:10px;" />
              <p style="margin:8px 0 0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#92744a;">Aurum Sovereign Capital</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">

              <!-- Gold top bar -->
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#C5A059,#e8c878,#C5A059);font-size:0;line-height:0;">&nbsp;</td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 36px 40px;">
                  ${body}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 36px 28px;border-top:1px solid #f1f5f9;background-color:#f8fafc;">
                  <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                    You received this email because you registered with Aurum Sovereign Capital.
                    This is an automated message — please do not reply directly to this email.
                  </p>
                </td>
              </tr>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Building blocks ───────────────────────────────────────────────────────────

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">${text}</p>`;
}

function ctaButton(text: string, href: string, color = "#C5A059"): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="background-color:${color};border-radius:10px;">
          <a href="${href}" target="_blank"
            style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;">${label}</span>
        <p style="margin:3px 0 0;font-size:14px;font-weight:500;color:#0f172a;">${value}</p>
      </td>
    </tr>`;
}

function infoTable(rows: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:20px 0;background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
      ${rows}
    </table>`;
}

function notice(text: string, variant: "gold" | "red" | "green" = "gold"): string {
  const colors = {
    gold:  { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
    red:   { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b" },
    green: { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
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
      ${p(`Welcome, <strong style="color:#0f172a;">${investorName}</strong>. Your registration has been received.`)}
      ${p("To access your sovereign deposit instructions and complete your early-stage capital allocation, please confirm your email address.")}
      ${ctaButton("Confirm Email Address", verificationUrl)}
      ${p("This link expires in <strong style=\"color:#0f172a;\">24 hours</strong>. If you did not register, you can safely ignore this message.")}
      ${notice("For your security, never share this link with anyone. Aurum Sovereign Capital will never ask for your password.")}
      <p style="margin:16px 0 0;padding:14px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;font-size:13px;line-height:1.6;color:#92400e;">
        📬 <strong>Can&apos;t find this email next time?</strong> Check your <strong>Spam</strong> or <strong>Junk</strong> folder and mark us as <strong>Not Spam</strong> to ensure you receive all future notifications including your approval confirmation.
      </p>
      `
    ),
  });
}

// ── Email 2: Email Confirmed ──────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  investorEmail: string,
  investorName: string,
  resetUrl: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Reset your password — Aurum Sovereign Capital",
    html: shell(
      "A password reset was requested for your account.",
      `
      ${h1("Reset Your Password")}
      ${p(`Hello, <strong style="color:#0f172a;">${investorName}</strong>.`)}
      ${p("A password reset was requested for your Aurum Sovereign Capital account. Click the button below to choose a new password.")}
      ${ctaButton("Reset Password", resetUrl)}
      ${p("This link expires in <strong style=\"color:#0f172a;\">1 hour</strong> and can only be used once.")}
      ${notice("If you did not request this reset, you can safely ignore this email — your password will remain unchanged. Aurum Sovereign Capital will never ask for your password.", "red")}
      `
    ),
  });
}

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
      ${p(`Your email address has been verified, <strong style="color:#0f172a;">${investorName}</strong>.`)}
      ${p("You can now sign in to view your sovereign deposit instructions, select your preferred banking institution, and submit your payment proof for audit verification.")}
      ${infoTable(
        infoRow("Next Step", "Sign in and initiate your bank transfer") +
        infoRow("Minimum Deposit", "USD 1,350") +
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
      ${p(`Thank you, <strong style="color:#0f172a;">${investorName}</strong>. Your payment receipt has been submitted to our sovereign audit desk.`)}
      ${p("Our team is currently reviewing your transfer documentation. You will receive an email confirmation immediately upon approval.")}
      ${infoTable(
        infoRow("Status", "Under Review") +
        infoRow("Expected Review Time", "24–48 hours") +
        infoRow("Notification Method", "Email")
      )}
      ${notice("Once approved, your early-stage capital allocation will be officially secured. The platform launch date will be announced via email before trading begins.")}
      `
    ),
  });
}

// ── Email 4: Admin Proof Notification (with approve/reject buttons) ───────────

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
  investorId: string;
}): Promise<void> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(params.intendedDepositAmount);

  const baseUrl = resolveAppBaseUrl();
  const approveUrl = `${baseUrl}/api/admin/deposit-decision?action=approve&userId=${params.investorId}`;
  const rejectUrl  = `${baseUrl}/api/admin/deposit-decision?action=reject&userId=${params.investorId}`;

  await dispatchEmail({
    to: ADMIN_EMAIL,
    subject: `[Action Required] New deposit proof — ${params.investorName}`,
    html: shell(
      `${params.investorName} submitted a deposit receipt for ${formattedAmount}. Review required.`,
      `
      ${h1("New Deposit Proof Submission")}
      ${p("An investor has submitted a payment receipt. The proof is attached. Review the details below and approve or reject.")}
      ${infoTable(
        infoRow("Investor Name", params.investorName) +
        infoRow("Email Address", params.investorEmail) +
        infoRow("Username", params.username) +
        infoRow("Phone Number", params.phoneNumber) +
        infoRow("Country", params.country) +
        infoRow("Intended Deposit Amount", formattedAmount) +
        infoRow("Proof File", `${params.proofFileName} (${params.proofMimeType})`) +
        infoRow("Submitted", new Date().toLocaleString("en-US", {
          timeZone: "Africa/Addis_Ababa",
          dateStyle: "full",
          timeStyle: "short",
        }))
      )}
      <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td style="background-color:#16a34a;border-radius:10px;padding:0;">
            <a href="${approveUrl}" target="_blank"
              style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
              ✓ Approve Deposit
            </a>
          </td>
          <td style="width:12px;"></td>
          <td style="background-color:#dc2626;border-radius:10px;padding:0;">
            <a href="${rejectUrl}" target="_blank"
              style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
              ✗ Reject Deposit
            </a>
          </td>
        </tr>
      </table>
      ${notice("The proof receipt is attached to this email. Retain this message as the authoritative audit record.", "gold")}
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
    subject: "Allocation secured — deposit verified ✓",
    html: shell(
      "Your deposit has been verified. Your early-stage allocation is officially secured.",
      `
      ${h1("Your Allocation Is Secured")}
      ${p(`Congratulations, <strong style="color:#0f172a;">${investorName}</strong>. Your bank transfer receipt has been successfully audited and approved by our sovereign verification desk.`)}
      ${p("Your early-stage capital allocation in Aurum Sovereign Capital is now officially secured.")}
      ${infoTable(
        infoRow("Verification Status", "✓ Approved") +
        infoRow("Allocation Status", "Secured") +
        infoRow("Platform Status", "Pre-launch")
      )}
      ${p("The Aurum trading terminal is completing final pre-launch configurations. You will receive a direct email notification the moment the platform opens for live capital execution.")}
      ${notice("Keep this email as your official confirmation of your investment with Aurum Sovereign Capital.", "green")}
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
      ${p(`Dear <strong style="color:#0f172a;">${investorName}</strong>, we were unable to verify the payment document you submitted.`)}
      ${p("This may be due to one of the following reasons:")}
      <ul style="margin:0 0 16px;padding-left:20px;color:#475569;font-size:15px;line-height:2.2;">
        <li>The document is blurry or partially cut off</li>
        <li>The transfer amount or account details are not clearly visible</li>
        <li>The document does not appear to be an official bank receipt</li>
        <li>The transfer details do not match our records</li>
      </ul>
      ${p("Please sign in to your account and upload a clear, official bank transfer receipt to continue.")}
      ${notice("If you believe this is an error or require assistance, please contact our support team.", "red")}
      `
    ),
  });
}

// ── Email 7: Admin Welcome (one-time credentials) ─────────────────────────────

export async function sendAdminWelcomeEmail(
  adminEmail: string,
  adminName: string,
  temporaryPassword: string,
  loginUrl: string
): Promise<void> {
  await dispatchEmail({
    to: adminEmail,
    subject: "Your Aurum Admin Terminal access",
    html: shell(
      "Your administrator account has been created. Sign in to access the terminal.",
      `
      ${h1("Admin Terminal Access")}
      ${p(`Your administrator account for the Aurum Sovereign Capital operator terminal has been created, <strong style="color:#0f172a;">${adminName}</strong>.`)}
      ${p("Use the credentials below to sign in. You will be redirected to the Admin Terminal after authentication.")}
      ${infoTable(
        infoRow("Email", adminEmail) +
        infoRow("Temporary Password", `<code style="font-family:monospace;font-size:15px;letter-spacing:0.05em;color:#0f172a;">${temporaryPassword}</code>`) +
        infoRow("Login URL", `<a href="${loginUrl}" style="color:#C5A059;">${loginUrl}</a>`)
      )}
      ${ctaButton("Sign In to Admin Terminal", loginUrl, "#0c1017")}
      ${notice("This is a one-time temporary password. After signing in, navigate to Profile Settings to set a permanent password.", "gold")}
      ${notice("Do not share this email or your credentials. If you did not expect this, contact the platform operator immediately.", "red")}
      `
    ),
  });
}
