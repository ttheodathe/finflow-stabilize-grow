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

interface ReceiptProps {
  customerName?: string;
  companyName?: string;
  amount: string;
  currency?: string;
  paymentDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  receiptUrl?: string;
}

export default function Receipt({
  customerName = "Customer",
  companyName = "FinFlowTrack",
  amount,
  currency = "USD",
  paymentDate = new Date().toLocaleDateString("en-US"),
  paymentMethod = "Card payment",
  receiptNumber = "N/A",
  receiptUrl = "https://www.finflowtrack.com",
}: ReceiptProps) {
  return (
    <Html>
      <Head />

      <Preview>
        Your FinFlowTrack payment receipt is ready
      </Preview>

      <Body
        style={{
          backgroundColor: "#f6f8fb",
          fontFamily:
            "Inter, Arial, Helvetica, sans-serif",
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "520px",
            margin: "0 auto",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >

          {/* Logo */}
          <Section
            style={{
              textAlign: "center",
              marginBottom: "30px",
            }}
          >
            <Img
              src="https://www.finflowtrack.com/logo.png"
              width="120"
              alt="FinFlowTrack"
              style={{
                margin: "0 auto",
              }}
            />
          </Section>


          {/* Header */}
          <Text
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
              textAlign: "center",
            }}
          >
            Payment Receipt
          </Text>


          <Text
            style={{
              fontSize: "16px",
              color: "#4b5563",
              lineHeight: "24px",
            }}
          >
            Hi {customerName},
          </Text>

          <Text
            style={{
              fontSize: "16px",
              color: "#4b5563",
              lineHeight: "24px",
            }}
          >
            Thank you for your payment. This email confirms
            that your transaction with {companyName} has been
            successfully completed.
          </Text>


          {/* Receipt Details */}
          <Section
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "10px",
              padding: "20px",
              margin: "25px 0",
            }}
          >

            <Text
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0",
              }}
            >
              Receipt Number
            </Text>

            <Text
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 15px",
              }}
            >
              {receiptNumber}
            </Text>


            <Text
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0",
              }}
            >
              Amount Paid
            </Text>

            <Text
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#10b981",
                margin: "0 0 15px",
              }}
            >
              {currency} {amount}
            </Text>


            <Text
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0",
              }}
            >
              Payment Date
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#111827",
                margin: "0 0 15px",
              }}
            >
              {paymentDate}
            </Text>


            <Text
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0",
              }}
            >
              Payment Method
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#111827",
                margin: "0",
              }}
            >
              {paymentMethod}
            </Text>

          </Section>


          {/* CTA */}
          <Section
            style={{
              textAlign: "center",
              margin: "30px 0",
            }}
          >
            <Button
              href={receiptUrl}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "14px 28px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "16px",
                textDecoration: "none",
              }}
            >
              View Receipt
            </Button>
          </Section>


          <Hr
            style={{
              borderColor: "#e5e7eb",
              margin: "30px 0",
            }}
          />


          <Text
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              color: "#6b7280",
            }}
          >
            Keep this receipt for your records.
            If you have any questions about this payment,
            please contact FinFlowTrack support.
          </Text>


          {/* Footer */}
          <Text
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              textAlign: "center",
              marginTop: "30px",
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
