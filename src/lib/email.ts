import { Resend } from "resend";

/**
 * Lazily construct the Resend client.
 *
 * IMPORTANT: `process.env` is injected per-request in the worker runtime, so
 * reading it at module scope yields `undefined` and `new Resend(undefined)`
 * throws "Missing API key" while the module graph is being loaded — which
 * crashes SSR for every route that transitively imports this file.
 */
let _resend: Resend | undefined;

export function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }
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
  const { data, error } = await getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject,
    html,
    text,
    replyTo,
    attachments,
  } as Parameters<Resend["emails"]["send"]>[0]);

  if (error) {
    console.error("Resend Error:", error);
    throw error;
  }

  return data;
}
