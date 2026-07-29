import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await resend.emails.send({
    from: "FinFlowTrack <noreply@finflowtrack.com>",
    to: body.email,
    subject: "Welcome to FinFlowTrack",
    html: "<h1>Welcome!</h1><p>Your account has been created successfully.</p>",
  });

  if (error) {
    return Response.json(error, { status: 400 });
  }

  return Response.json(data);
}
