// src/routes/api/webhooks/polar.ts
import { createServerFileRoute } from '@tanstack/react-start/server';
import { Webhooks } from '@polar-sh/sdk/webhooks';
import { sendEmail } from '~/lib/email/resend';

export const ServerRoute = createServerFileRoute('/api/webhooks/polar').methods({
  POST: async ({ request }) => {
    const payload = await request.text();
    const signature = request.headers.get('webhook-signature') ?? '';

    // verify using Polar's webhook secret (POLAR_WEBHOOK_SECRET env var)
    const event = Webhooks.verify(payload, {
      secret: process.env.POLAR_WEBHOOK_SECRET!,
      headers: Object.fromEntries(request.headers),
    });

    switch (event.type) {
      case 'order.paid': {
        const { customer, product, totalAmount } = event.data;
        await sendEmail({
          to: customer.email,
          subject: 'Your FinFlowTrack receipt',
          html: renderReceiptEmail({ product, totalAmount }),
        });
        break;
      }
      case 'subscription.canceled': {
        // send cancellation confirmation
        break;
      }
      // ... other cases
    }

    return new Response('ok', { status: 200 });
  },
});
