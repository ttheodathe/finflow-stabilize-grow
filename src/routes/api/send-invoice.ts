import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import { InvoiceCreated } from "@/emails/InvoiceCreated";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export const Route = createFileRoute(
  "/api/send-invoice"
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
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


          const { data, error } =
            await resend.emails.send({
              from:
                "FinFlowTrack <invoices@finflowtrack.com>",

              to: [
                customerEmail,
              ],

              subject:
                `Invoice ${invoiceNumber} from ${
                  companyName || "FinFlowTrack"
                }`,

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
            console.error(error);

            return Response.json(
              {
                error:
                  "Failed sending invoice",
              },
              {
                status: 500,
              }
            );
          }


          return Response.json({
            success: true,
            id: data?.id,
          });


        } catch (error) {

          console.error(error);

          return Response.json(
            {
              error:
                "Server error",
            },
            {
              status: 500,
            }
          );
        }
      },
    },
  },
});
