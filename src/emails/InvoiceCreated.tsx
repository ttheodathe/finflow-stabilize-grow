import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Hr,
  Preview,
} from "@react-email/components";

interface InvoiceCreatedProps {
  customerName?: string;
  companyName?: string;
  invoiceNumber: string;
  amount: string;
  currency?: string;
  dueDate?: string;
  invoiceUrl?: string;
}

export default function InvoiceCreated({
  customerName = "Customer",
  companyName = "FinFlowTrack",
  invoiceNumber,
  amount,
  currency = "USD",
  dueDate,
  invoiceUrl = "https://www.finflowtrack.com",
}: InvoiceCreatedProps) {
  return (
    <Html>
      <Head />

      <Preview>
        New invoice {invoiceNumber} from {companyName}
      </Preview>

      <Body
        style={{
          backgroundColor: "#f6f8fb",
          fontFamily:
            "Inter, Arial, sans-serif",
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            maxWidth: "520px",
            margin: "0 auto",
            padding: "40px",
            borderRadius: "12px",
          }}
        >
          <Section
            style={{
              textAlign: "center",
            }}
          >
            <Img
              src="https://www.finflowtrack.com/logo.png"
              width="120"
              alt="FinFlowTrack"
            />
          </Section>


          <Text
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
            }}
          >
            New Invoice Received
          </Text>


          <Text>
            Hi {customerName},
          </Text>


          <Text>
            {companyName} has sent you a new invoice
            through FinFlowTrack.
          </Text>


          <Section
            style={{
              backgroundColor: "#f9fafb",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <Text>
              Invoice Number:
              <strong>
                {" "}
                {invoiceNumber}
              </strong>
            </Text>

            <Text>
              Amount:
              <strong>
                {" "}
                {currency} {amount}
              </strong>
            </Text>

            {dueDate && (
              <Text>
                Due Date:
                <strong>
                  {" "}
                  {dueDate}
                </strong>
              </Text>
            )}
          </Section>


          <Section
            style={{
              textAlign: "center",
              margin: "30px 0",
            }}
          >
            <Button
              href={invoiceUrl}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "14px 28px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              View Invoice
            </Button>
          </Section>


          <Hr />

          <Text
            style={{
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
            If you have questions about this invoice,
            please contact the sender.
          </Text>


          <Text
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            © {new Date().getFullYear()} FinFlowTrack.
            All rights reserved.
          </Text>

        </Container>
      </Body>
    </Html>
  );
}
