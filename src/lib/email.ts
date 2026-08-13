// Lazily construct the Resend client without importing it at module scope.
// Dynamic import keeps the server-only `resend` package out of client bundles.

let _resend: any | undefined;

export async function getResend() {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }
  const { Resend } = await import("resend");
  _resend = new Resend(apiKey);
  return _resend;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "FinFlowTrack <noreply@finflowtrack.com>";
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
    // Accept Buffer or string; this is a type-only hint and does not cause the
    // Resend package to be bundled because we avoid importing it at module scope.
    content: Buffer | string;
  }[];
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  attachments,
}: SendEmailOptions) {
  const resend = await getResend();
  const { data, error } = await resend.emails.send({
    from: getEmailFrom(),
    to,
    subject,
    html,
    text,
    replyTo,
    attachments,
  } as Parameters<any["emails"]["send"]>[0]);

  if (error) {
    console.error("Resend Error:", error);
    throw error;
  }

  return data;
}
