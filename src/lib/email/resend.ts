import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const { data, error } = await resend.emails.send({
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
