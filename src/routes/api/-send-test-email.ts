import { render } from "@react-email/render";
import WelcomeEmail from "@/emails/Welcome";
import { sendEmail } from "@/lib/email";

interface TestEmailRequest {
  email: string;
  firstName?: string;
}

export async function POST(request: Request) {
  try {
    const body: TestEmailRequest = await request.json();

    if (!body.email) {
      return Response.json(
        {
          success: false,
          message: "Recipient email is required.",
        },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.APP_URL ?? "https://www.finflowtrack.com";

    // IMPORTANT: No JSX in a .ts file
    const html = await render(
      WelcomeEmail({
        firstName: body.firstName ?? "User",
        dashboardUrl: `${appUrl}/dashboard`,
      })
    );

    const result = await sendEmail({
      to: body.email,
      subject: "✅ FinFlowTrack Email Test",
      html,
      text:
        "Congratulations! Your FinFlowTrack email integration is working correctly.",
    });

    return Response.json({
      success: true,
      message: "Test email sent successfully.",
      resendId: result?.id ?? null,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to send test email.",
      },
      { status: 500 }
    );
  }
}
