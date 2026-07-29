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

interface InvitationProps {
  inviterName?: string;
  companyName?: string;
  inviteUrl: string;
}

export default function Invitation({
  inviterName = "A team member",
  companyName = "your company",
  inviteUrl,
}: InvitationProps) {
  return (
    <Html>
      <Head />

      <Preview>
        You have been invited to join {companyName} on FinFlowTrack
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


          {/* Heading */}
          <Text
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            You're invited to join FinFlowTrack
          </Text>


          {/* Message */}
          <Text
            style={{
              fontSize: "16px",
              lineHeight: "24px",
              color: "#4b5563",
            }}
          >
            Hi there,
          </Text>

          <Text
            style={{
              fontSize: "16px",
              lineHeight: "24px",
              color: "#4b5563",
            }}
          >
            <strong>{inviterName}</strong> has invited you
            to collaborate with{" "}
            <strong>{companyName}</strong> on FinFlowTrack.
          </Text>

          <Text
            style={{
              fontSize: "16px",
              lineHeight: "24px",
              color: "#4b5563",
            }}
          >
            FinFlowTrack helps teams manage invoices,
            expenses, cash flow, and business finances
            from one simple platform.
          </Text>


          {/* CTA */}
          <Section
            style={{
              textAlign: "center",
              margin: "32px 0",
            }}
          >
            <Button
              href={inviteUrl}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding:
                  "14px 28px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "16px",
                textDecoration: "none",
              }}
            >
              Accept Invitation
            </Button>
          </Section>


          {/* Link fallback */}
          <Text
            style={{
              fontSize: "14px",
              lineHeight: "20px",
              color: "#6b7280",
            }}
          >
            If the button does not work, copy and paste
            this link into your browser:
          </Text>

          <Text
            style={{
              fontSize: "13px",
              color: "#2563eb",
              wordBreak: "break-all",
            }}
          >
            {inviteUrl}
          </Text>


          <Hr
            style={{
              borderColor: "#e5e7eb",
              margin: "30px 0",
            }}
          />


          {/* Security */}
          <Text
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              color: "#6b7280",
            }}
          >
            If you were not expecting this invitation,
            you can ignore this email. No action is
            required.
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
