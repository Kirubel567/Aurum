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

function brandedShell(title: string, body: string): string {
  return `
    <div style="background:#f8fafc;color:#0f172a;font-family:Inter,Arial,sans-serif;padding:32px;">
      <div style="max-width:560px;margin:0 auto;border:1px solid rgba(197,160,89,0.35);border-radius:16px;padding:28px;background:#ffffff;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#C5A059;">Aurum Sovereign Capital</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#334155;">${body}</div>
      </div>
    </div>
  `;
}

export async function sendEmailVerificationEmail(
  investorEmail: string,
  investorName: string,
  verificationUrl: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Confirm your email — Aurum Sovereign Capital",
    html: brandedShell(
      "Verify Your Email",
      `<p>Dear ${investorName},</p>
      <p>Thank you for registering with Aurum Sovereign Capital. Please confirm your email address to proceed with your deposit verification.</p>
      <p style="margin:24px 0;">
        <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#C5A059;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          Confirm Email Address
        </a>
      </p>
      <p style="font-size:13px;color:#64748b;">This link expires in 24 hours. If you did not create an account, please disregard this message.</p>
      <p style="color:#C5A059;">Aurum Sovereign Capital — Early Access Programme</p>`
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
    html: brandedShell(
      "Email Confirmed",
      `<p>Dear ${investorName},</p>
      <p>Your email address has been successfully verified. Sign in to view your sovereign deposit instructions and submit your payment proof.</p>
      <p style="color:#C5A059;">Aurum Sovereign Capital — Early Access Programme</p>`
    ),
  });
}

export async function sendInvestorProofReceivedEmail(
  investorEmail: string,
  investorName: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Deposit proof received — under sovereign review",
    html: brandedShell(
      "Proof Received",
      `<p>Dear ${investorName},</p>
      <p>Your deposit proof has been received and is currently under review by our sovereign audit team. You will be notified via email immediately upon verification.</p>
      <p style="color:#C5A059;">Aurum Sovereign Capital — Early Access Programme</p>`
    ),
  });
}

export async function sendAdminProofNotificationEmail(params: {
  investorEmail: string;
  investorName: string;
  username: string;
  phoneNumber: string;
  country: string;
  proofFileName: string;
  proofBase64: string;
  proofMimeType: string;
}): Promise<void> {
  await dispatchEmail({
    to: ADMIN_EMAIL,
    subject: `[Action Required] Deposit proof — ${params.investorName}`,
    html: brandedShell(
      "New Deposit Proof Submission",
      `<p><strong>Investor:</strong> ${params.investorName}</p>
      <p><strong>Email:</strong> ${params.investorEmail}</p>
      <p><strong>Username:</strong> ${params.username}</p>
      <p><strong>Phone:</strong> ${params.phoneNumber}</p>
      <p><strong>Country:</strong> ${params.country}</p>
      <p><strong>Attachment:</strong> ${params.proofFileName} (${params.proofMimeType})</p>
      <p>The attached payment receipt is included for manual verification. Retain this message as the authoritative audit record.</p>`
    ),
    attachments: [
      {
        filename: params.proofFileName,
        content: params.proofBase64,
      },
    ],
  });
}

export async function sendInvestorApprovalEmail(
  investorEmail: string,
  investorName: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Deposit verified — allocation secured",
    html: brandedShell(
      "Account Verified & Allocation Locked",
      `<p>Dear ${investorName},</p>
      <p>Your bank wire deposit proof has been successfully audited and approved. Your early-stage capital allocation is officially secured.</p>
      <p>The sovereign capital platform is currently undergoing final deployment configurations. You will receive an automated email notification the moment the terminal opens for live capital execution.</p>
      <p style="color:#C5A059;">Aurum Sovereign Capital — Early Access Programme</p>`
    ),
  });
}

export async function sendInvestorRejectionEmail(
  investorEmail: string,
  investorName: string
): Promise<void> {
  await dispatchEmail({
    to: investorEmail,
    subject: "Deposit proof requires resubmission",
    html: brandedShell(
      "Verification Unsuccessful",
      `<p>Dear ${investorName},</p>
      <p>We were unable to verify your submitted payment document. Please sign in and upload a valid bank transfer receipt to continue.</p>`
    ),
  });
}
