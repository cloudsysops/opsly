import { supabaseServer } from '@/lib/supabase';
import { markTransactionAsPaid } from '@/lib/services/franchise-payment.service';
import { verifyStripeWebhookSignature } from '@/lib/services/payment.service';

/**
 * POST /api/webhooks/stripe-franchise-payment
 * Webhook handler for Stripe franchise payment events
 * Updates revenue tracking when Stripe Connected Account transfers complete
 */
export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const signatureHeader = req.headers.get('stripe-signature');

  try {
    const rawBody = await req.text();

    // Verify webhook signature
    if (!verifyStripeWebhookSignature(rawBody, signatureHeader)) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid webhook signature',
          request_id: requestId,
        },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    // Handle payout completion event (transfer to Peskids account succeeded)
    if (event.type === 'transfer.created') {
      const transfer = event.data.object;

      // Look up the franchise transaction by the Stripe transaction reference
      const platformDb = supabaseServer().schema('platform');
      const { data: transaction, error: lookupError } = await platformDb
        .from('franchise_revenue_tracking')
        .select('*')
        .eq('transaction_id', transfer.id)
        .eq('payment_provider', 'stripe')
        .single();

      if (lookupError) {
        console.warn(`Could not find transaction for Stripe transfer ${transfer.id}`, lookupError);
        return Response.json({ ok: true }, { status: 200 });
      }

      // Mark as paid
      const updateResult = await markTransactionAsPaid({
        transactionId: transaction.id,
        payoutId: transfer.id,
        payoutDate: new Date(transfer.created * 1000),
      });

      if (!updateResult.success) {
        console.error('Failed to mark transaction as paid:', updateResult.error);
        return Response.json(
          {
            ok: false,
            error: 'Failed to update transaction',
            request_id: requestId,
          },
          { status: 500 }
        );
      }
    }

    // Handle transfer failure
    if (event.type === 'transfer.failed') {
      const transfer = event.data.object;
      const platformDb = supabaseServer().schema('platform');

      await platformDb
        .from('franchise_revenue_tracking')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transfer.id);
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return Response.json(
      {
        ok: false,
        error: 'Webhook processing failed',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
