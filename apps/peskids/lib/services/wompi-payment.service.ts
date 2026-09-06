import { supabaseServer } from '@/lib/supabase';
import type { PaymentStatus } from '@/lib/class-types';
import { getClassById } from '@/lib/services/class.service';
import {
  markEnrollmentPaidBySession,
  recordCheckoutSession,
} from '@/lib/services/payment.service';
import {
  resolveWompiForTenant,
  WompiClient,
  verifyWompiWebhookSignature as verifyWompiWebhookSignatureGeneric,
  type WompiWebhookEvent,
} from '@intcloudsysops/wompi-gateway';

export type { WompiWebhookEvent };

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return 'https://www.peskids.com';
}

export async function createWompiPaymentLinkForEnrollment(input: {
  enrollmentId: string;
  familyUserId: string;
}): Promise<{ checkout_url: string; payment_link_id: string }> {
  const wompiConfig = resolveWompiForTenant(tenantSlug());
  if (!wompiConfig?.enabled) {
    throw new Error('Wompi not configured for this tenant');
  }

  const { data: enrollment, error } = await peskidsClient()
    .from('class_enrollments')
    .select('*')
    .eq('id', input.enrollmentId)
    .eq('family_user_id', input.familyUserId)
    .maybeSingle();

  if (error) throw error;
  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  const row = enrollment as {
    id: string;
    class_id: string;
    payment_status: PaymentStatus;
  };

  if (row.payment_status === 'paid') {
    throw new Error('Already paid');
  }

  const classItem = await getClassById(row.class_id);
  if (!classItem) {
    throw new Error('Class not found');
  }

  const client = new WompiClient({ privateKey: wompiConfig.privateKey });
  const { paymentLinkId, checkoutUrl } = await client.createPaymentLink({
    name: classItem.title,
    description: `Inscripción Peskids — ${classItem.title}`,
    amountInCents: classItem.price_cents,
    redirectUrl: `${appBaseUrl()}/familias/reservas?paid=1`,
  });

  // Atomic (see migration 20260905_payment_atomicity_and_webhook_idempotency):
  // stamping the payment-link id on the enrollment and creating the pending
  // payment row happen in one transaction, so a Wompi link can never exist
  // without a payment row for the webhook to settle.
  await recordCheckoutSession({
    enrollmentId: row.id,
    familyUserId: input.familyUserId,
    provider: 'wompi',
    sessionId: paymentLinkId,
    amountCents: classItem.price_cents,
    currency: 'cop',
    metadata: { class_id: row.class_id },
  });

  return { checkout_url: checkoutUrl, payment_link_id: paymentLinkId };
}

/**
 * Marks an enrollment paid once Wompi confirms the transaction.
 *
 * NEEDS LIVE VERIFICATION: this looks up the enrollment by matching the
 * transaction's payment_link_id (falling back to reference) against the
 * payment_link id we stored at checkout time. Confirm against one real
 * sandbox transaction that `transaction.payment_link_id` is actually present
 * on the webhook payload before enabling in production — Wompi's exact
 * transaction shape for payment-link-originated payments wasn't fully
 * verifiable from here.
 */
export async function markEnrollmentPaidFromWompi(input: {
  paymentLinkId: string;
  transactionId: string;
  status: string;
}): Promise<{ applied: boolean; alreadyPaid: boolean }> {
  if (input.status !== 'APPROVED') {
    return { applied: false, alreadyPaid: false };
  }

  // One transaction for both rows. Previously these were two separate updates
  // AND the second one overwrote wompi_transaction_id (the payment-link id) with
  // the transaction id — so a partial failure could not be retried, because the
  // key the lookup depends on had already been destroyed. The link id now lives
  // in its own column (wompi_payment_link_id) and is never overwritten.
  const result = await markEnrollmentPaidBySession({
    provider: 'wompi',
    sessionId: input.paymentLinkId,
    transactionId: input.transactionId,
  });

  return { applied: true, alreadyPaid: result.alreadyPaid };
}

export function verifyWompiWebhookSignature(rawBody: string): WompiWebhookEvent | null {
  const wompiConfig = resolveWompiForTenant(tenantSlug());
  if (!wompiConfig?.enabled) return null;
  return verifyWompiWebhookSignatureGeneric(rawBody, wompiConfig.eventsSecret);
}
