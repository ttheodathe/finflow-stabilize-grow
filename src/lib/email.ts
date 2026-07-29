import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("Missing RESEND_API_KEY environment variable.");
}

export const resend = new Resend(apiKey);

export const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  "FinFlowTrack <noreply@finflowtrack.com>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
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
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
    attachments,
  });

  if (error) {
    console.error("Resend Error:", error);
    throw error;
  }

  return data;
}
