import { Resend } from "resend";
import { InvoiceCreated } from "@/emails/InvoiceCreated";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function POST({
  request,
}: {
  request: Request;
}) {
  try {
    const body = await request.json();

    const {
      customerEmail,
      customerName,
      invoiceNumber,
      amount,
      currency,
      dueDate,
      invoiceUrl,
      companyName,
    } = body;


    // Validation
    if (!customerEmail) {
      return Response.json(
        {
          error:
            "Customer email is required",
        },
        {
          status: 400,
        }
      );
    }


    if (!invoiceNumber || !amount) {
      return Response.json(
        {
          error:
            "Invoice details are incomplete",
        },
        {
          status: 400,
        }
      );
    }


    // Send email
    const { data, error } =
      await resend.emails.send({
        from:
          "FinFlowTrack <invoices@finflowtrack.com>",

        to: [
          customerEmail,
        ],

        subject:
          `Invoice ${invoiceNumber} from ${companyName || "FinFlowTrack"}`,

        react: (
          <InvoiceCreated
            customerName={
              customerName || "Customer"
            }
            companyName={
              companyName || "FinFlowTrack"
            }
            invoiceNumber={
              invoiceNumber
            }
            amount={
              amount
            }
            currency={
              currency || "USD"
            }
            dueDate={
              dueDate
            }
            invoiceUrl={
              invoiceUrl
            }
          />
        ),
      });


    if (error) {
      console.error(
        "Invoice email error:",
        error
      );

      return Response.json(
        {
          error:
            "Failed to send invoice email",
        },
        {
          status: 500,
        }
      );
    }


    return Response.json({
      success: true,
      message:
        "Invoice sent successfully",
      emailId:
        data?.id,
    });


  } catch (error) {

    console.error(
      "Send invoice error:",
      error
    );


    return Response.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
