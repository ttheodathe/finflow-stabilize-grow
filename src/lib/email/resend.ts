import { Resend } from 'resend';

// Lazy: process.env is per-request in the worker runtime. Constructing at
// module scope throws "Missing API key" and breaks SSR for the whole app.
let _resend: Resend | undefined;

function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  html,
  from = 'FinFlowTrack <noreply@finflowtrack.com>',
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const { data, error } = await getResend().emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Resend send error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
