import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface InvoiceEmailProps {
  companyName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  currency?: string;
  dueDate: string;
  invoiceUrl: string;
}

export default function InvoiceEmail({
  companyName,
  clientName,
  invoiceNumber,
  amount,
  currency = "$",
  dueDate,
  invoiceUrl,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Invoice {invoiceNumber} from {companyName}
      </Preview>

      <Body
        style={{
          backgroundColor: "#f5f7fb",
          fontFamily: "Inter,Arial,sans-serif",
          padding: "40px 20px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            maxWidth: "620px",
          }}
        >
          <Section
            style={{
              backgroundColor: "#0f172a",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <Heading
              style={{
                color: "#ffffff",
                margin: 0,
              }}
            >
              {companyName}
            </Heading>

            <Text
              style={{
                color: "#cbd5e1",
              }}
            >
              Professional Invoice
            </Text>
          </Section>

          <Section style={{ padding: "40px" }}>
            <Heading
              style={{
                fontSize: "24px",
                color: "#111827",
              }}
            >
              Hello {clientName},
            </Heading>

            <Text
              style={{
                color: "#374151",
                lineHeight: "28px",
              }}
            >
              A new invoice has been issued for your review.
            </Text>

            <Hr />

            <table
              style={{
                width: "100%",
                marginTop: "20px",
                marginBottom: "20px",
              }}
            >
              <tbody>
                <tr>
                  <td><strong>Invoice</strong></td>
                  <td>{invoiceNumber}</td>
                </tr>

                <tr>
                  <td><strong>Amount Due</strong></td>
                  <td>
                    {currency}
                    {amount}
                  </td>
                </tr>

                <tr>
                  <td><strong>Due Date</strong></td>
                  <td>{dueDate}</td>
                </tr>
              </tbody>
            </table>

            <Section
              style={{
                textAlign: "center",
                marginTop: "35px",
                marginBottom: "35px",
              }}
            >
              <Button
                href={invoiceUrl}
                style={{
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  padding: "16px 34px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                View Invoice
              </Button>
            </Section>

            <Text
              style={{
                color: "#6b7280",
                lineHeight: "28px",
              }}
            >
              If you've already completed payment, please disregard this
              reminder.
            </Text>

            <Hr />

            <Text
              style={{
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Questions?
            </Text>

            <Link href="mailto:support@finflowtrack.com">
              support@finflowtrack.com
            </Link>
          </Section>

          <Section
            style={{
              backgroundColor: "#f8fafc",
              padding: "24px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "13px",
            }}
          >
            © {new Date().getFullYear()} {companyName}

            <br />

            <Link href="https://www.finflowtrack.com">
              www.finflowtrack.com
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
