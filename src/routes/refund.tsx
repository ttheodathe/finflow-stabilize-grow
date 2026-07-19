import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/refund")({
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <div className="container max-w-5xl mx-auto py-12 px-4">
      <div className="space-y-10">

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Refund Policy
          </h1>

          <p className="text-muted-foreground">
            Effective Date: July 20, 2026
          </p>

          <p className="text-lg text-muted-foreground">
            At <strong>FinFlow</strong>, we want every customer to subscribe
            with confidence. This Refund Policy explains when refunds may be
            granted for subscriptions purchased through our platform.
          </p>

          <p className="text-muted-foreground">
            FinFlow uses <strong>Paddle.com Market Limited ("Paddle")</strong>
            as our Merchant of Record. Paddle securely processes payments,
            invoices, taxes, and approved refunds.
          </p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-8">

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                1. Subscription Payments
              </h2>

              <p>
                FinFlow offers subscription-based access to premium accounting,
                bookkeeping, invoicing, reporting, and business management
                features.
              </p>

              <p className="mt-3">
                Subscription plans may include:
              </p>

              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Monthly subscriptions</li>
                <li>Annual subscriptions</li>
                <li>Enterprise agreements</li>
              </ul>

              <p className="mt-3">
                Prices are displayed before checkout.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                2. Free Plan
              </h2>

              <p>
                FinFlow provides a free plan that allows users to evaluate the
                platform before upgrading.
              </p>

              <p className="mt-3">
                Because customers can test the software before purchasing,
                refunds are limited to the situations described below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                3. Eligible Refund Requests
              </h2>

              <p>
                Refund requests may be approved when:
              </p>

              <ul className="list-disc ml-6 mt-3 space-y-2">
                <li>Duplicate payments were made.</li>
                <li>A verified billing error occurred.</li>
                <li>The same subscription was purchased more than once.</li>
                <li>Your subscription renewed after a cancellation because of a system error.</li>
                <li>FinFlow was unable to provide the subscribed service due to a prolonged technical outage.</li>
              </ul>

              <p className="mt-4">
                Every refund request is reviewed individually.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                4. Situations That Normally Do Not Qualify
              </h2>

              <ul className="list-disc ml-6 space-y-2">
                <li>Forgetting to cancel before renewal.</li>
                <li>Changing your business needs.</li>
                <li>Not using the software.</li>
                <li>Purchasing the wrong plan.</li>
                <li>Dissatisfaction with features clearly described before purchase.</li>
                <li>Internet connectivity problems.</li>
                <li>Third-party integration issues outside FinFlow's control.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                5. Cancelling Your Subscription
              </h2>

              <p>
                You may cancel your subscription at any time from your account
                settings.
              </p>

              <ul className="list-disc ml-6 mt-3 space-y-2">
                <li>Your subscription remains active until the end of the current billing period.</li>
                <li>No future renewal charges will occur after cancellation.</li>
                <li>Premium features end when the current subscription expires.</li>
              </ul>

              <p className="mt-3">
                Cancellation does not automatically result in a refund.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                6. Billing Errors
              </h2>

              <p>
                If you believe a billing error occurred, please contact us
                within <strong>14 days</strong> of the transaction.
              </p>

              <p className="mt-3">
                Please include:
              </p>

              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Your account email address</li>
                <li>Invoice number</li>
                <li>Payment date</li>
                <li>Description of the issue</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                7. Unauthorized Transactions
              </h2>

              <p>
                If you suspect unauthorized use of your payment method:
              </p>

              <ol className="list-decimal ml-6 mt-3 space-y-2">
                <li>Contact FinFlow immediately.</li>
                <li>Notify your bank or card issuer.</li>
                <li>We will cooperate with Paddle during the investigation.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                8. Refund Processing
              </h2>

              <p>
                Approved refunds are processed through Paddle using the original
                payment method whenever possible.
              </p>

              <p className="mt-3">
                Depending on your bank or payment provider, refunds typically
                appear within <strong>5–10 business days</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                9. Chargebacks
              </h2>

              <p>
                Before filing a chargeback with your financial institution,
                please contact our support team.
              </p>

              <p className="mt-3">
                Most billing issues can be resolved much faster through our
                support process.
              </p>

              <p className="mt-3">
                Fraudulent or abusive chargebacks may result in account
                suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                10. Plan Changes
              </h2>

              <ul className="list-disc ml-6 space-y-2">
                <li>Upgrades may be charged on a prorated basis.</li>
                <li>Downgrades normally take effect at the next billing cycle.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                11. Enterprise Agreements
              </h2>

              <p>
                Enterprise customers may have custom billing and refund terms
                specified in their signed agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                12. Consumer Rights
              </h2>

              <p>
                Nothing in this Refund Policy limits any mandatory rights
                provided by applicable consumer protection laws.
              </p>

              <p className="mt-3">
                Where local laws provide additional refund rights, those rights
                will apply.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                13. Contact Us
              </h2>

              <p>
                If you have questions about refunds or billing, please contact
                us:
              </p>

              <div className="mt-4 rounded-lg border p-5 bg-muted/30 space-y-2">
                <p><strong>FinFlow Support</strong></p>
                <p>Email: support@finflowtrack.com</p>
                <p>Website: https://finflowtrack.com</p>
              </div>
            </section>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
