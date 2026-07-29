import { render } from "@react-email/render";
import WelcomeEmail from "@/emails/Welcome";
import { sendEmail } from "@/lib/email";

interface SendEmailBody {
  email: string;
  firstName?: string;
}

export async function POST(request: Request) {
  try {
    const body: SendEmailBody = await request.json();

    if (!body.email) {
      return Response.json(
        {
          success: false,
          message: "Email address is required.",
        },
        { status: 400 }
      );
    }

    const html = await render(
      WelcomeEmail({
        firstName: body.firstName,
        dashboardUrl:
          process.env.APP_URL || "https://www.finflowtrack.com/dashboard",
      })
    );

    const result = await sendEmail({
      to: body.email,
      subject: "Welcome to FinFlowTrack 🎉",
      html,
    });

    return Response.json({
      success: true,
      message: "Email sent successfully.",
      id: result?.id,
    });
  } catch (error: any) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: error.message || "Unable to send email.",
      },
      {
        status: 500,
      }
    );
  }
}
