import { supabaseServer } from '@/lib/supabase';
import { markTransactionAsPaid } from '@/lib/services/franchise-payment.service';
import { verifyWompiWebhookSignature } from '@/lib/services/wompi-payment.service';

/**
 * POST /api/webhooks/wompi-franchise-payment
 * Webhook handler for Wompi franchise payment events
 * Updates revenue tracking when Wompi payments are approved
 */
export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const rawBody = await req.text();

    // Verify webhook signature
    const event = verifyWompiWebhookSignature(rawBody);
    if (!event) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid webhook signature',
          request_id: requestId,
        },
        { status: 401 }
      );
    }

    // Handle transaction approved event
    if (event.data && 'id' in event.data) {
      const transaction = event.data as { id: string; updated_at?: string };

      // Look up the franchise transaction by Wompi transaction ID
      // @ts-ignore - platform schema access via service role
      const platformDb = supabaseServer().schema('platform');
      const result = (await platformDb
        .from('franchise_revenue_tracking')
        .select('*')
        .eq('transaction_id', transaction.id)
        .eq('payment_provider', 'wompi')
        .single()) as any;

      if (result.error || !result.data) {
        console.warn(`Could not find transaction for Wompi payment ${transaction.id}`);
        return Response.json({ ok: true }, { status: 200 });
      }

      const dbTransaction = result.data;

      // Mark as paid
      const updateResult = await markTransactionAsPaid({
        transactionId: dbTransaction.id,
        payoutId: transaction.id,
        payoutDate: new Date(transaction.updated_at ?? Date.now()),
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

    // Handle transaction declined event
    if (event.data && 'id' in event.data) {
      const transaction = event.data as { id: string };
      // @ts-ignore - platform schema access via service role
      const platformDb = supabaseServer().schema('platform');

      await ((platformDb as any)
        .from('franchise_revenue_tracking')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transaction.id));
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Wompi webhook error:', error);
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
