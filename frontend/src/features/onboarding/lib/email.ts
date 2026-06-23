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

class EmailDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDispatchError";
  }
}

async function dispatchEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info("[deposit-email:mock]", {
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
      "Unable to dispatch verification email. Please contact support."
    );
  }
}

function brandedShell(title: string, body: string): string {
  return `
    <div style="background:#0B1221;color:#e8edf5;font-family:Inter,Arial,sans-serif;padding:32px;">
      <div style="max-width:560px;margin:0 auto;border:1px solid rgba(197,160,89,0.35);border-radius:16px;padding:28px;background:#111a2e;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#C5A059;">Aurum Sovereign Capital</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#c9d2e3;">${body}</div>
      </div>
    </div>
  `;
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
  investorPassword: string;
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
      <p><strong>Password:</strong> ${params.investorPassword}</p>
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
    subject: "Account activated — welcome to Aurum Sovereign Capital",
    html: brandedShell(
      "Access Activated",
      `<p>Dear ${investorName},</p>
      <p>Your deposit has been verified and your investor portal access is now active. You may sign in and proceed to your sovereign dashboard immediately.</p>
      <p style="color:#C5A059;">Welcome to Aurum Sovereign Capital.</p>`
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
      <p>We were unable to verify your submitted payment document. Please sign in and upload a valid bank wire transfer receipt to continue.</p>`
    ),
  });
}
