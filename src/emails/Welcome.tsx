import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  firstName?: string;
  dashboardUrl: string;
}

export default function WelcomeEmail({
  firstName = "there",
  dashboardUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />

      <Preview>Welcome to FinFlowTrack 🚀</Preview>

      <Body
        style={{
          backgroundColor: "#f5f7fb",
          fontFamily:
            "Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
          margin: 0,
          padding: "40px 20px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            maxWidth: "600px",
            margin: "0 auto",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* Header */}

          <Section
            style={{
              backgroundColor: "#0f172a",
              padding: "35px",
              textAlign: "center",
            }}
          >
            <Img
              src="https://www.finflowtrack.com/logo.png"
              width="64"
              height="64"
              alt="FinFlowTrack"
              style={{
                margin: "0 auto 15px",
              }}
            />

            <Heading
              style={{
                color: "#ffffff",
                fontSize: "30px",
                margin: 0,
              }}
            >
              Welcome to FinFlowTrack
            </Heading>

            <Text
              style={{
                color: "#cbd5e1",
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              Smart accounting for freelancers, startups and growing businesses.
            </Text>
          </Section>

          {/* Content */}

          <Section style={{ padding: "40px" }}>
            <Heading
              style={{
                fontSize: "24px",
                color: "#111827",
              }}
            >
              Hi {firstName},
            </Heading>

            <Text
              style={{
                color: "#374151",
                fontSize: "16px",
                lineHeight: "28px",
              }}
            >
              Thanks for creating your FinFlowTrack account.
            </Text>

            <Text
              style={{
                color: "#374151",
                fontSize: "16px",
                lineHeight: "28px",
              }}
            >
              You now have access to a powerful accounting platform designed to
              help you:
            </Text>

            <ul
              style={{
                color: "#374151",
                fontSize: "16px",
                lineHeight: "28px",
              }}
            >
              <li>Create professional invoices</li>
              <li>Track expenses</li>
              <li>Manage clients</li>
              <li>Monitor cash flow</li>
              <li>Generate financial reports</li>
            </ul>

            <Section
              style={{
                textAlign: "center",
                marginTop: "40px",
                marginBottom: "40px",
              }}
            >
              <Button
                href={dashboardUrl}
                style={{
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  padding: "16px 32px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                Open Dashboard
              </Button>
            </Section>

            <Hr />

            <Text
              style={{
                color: "#6b7280",
                fontSize: "15px",
                lineHeight: "26px",
              }}
            >
              Need help?
            </Text>

            <Text
              style={{
                color: "#6b7280",
                fontSize: "15px",
                lineHeight: "26px",
              }}
            >
              Contact us anytime at{" "}
              <Link href="mailto:support@finflowtrack.com">
                support@finflowtrack.com
              </Link>
            </Text>
          </Section>

          {/* Footer */}

          <Section
            style={{
              backgroundColor: "#f8fafc",
              padding: "25px",
              textAlign: "center",
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
            © {new Date().getFullYear()} FinFlowTrack

            <br />

            Kigali, Rwanda

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
