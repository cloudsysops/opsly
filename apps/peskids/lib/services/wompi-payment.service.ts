import { supabaseServer } from '@/lib/supabase';
import type { PaymentStatus } from '@/lib/class-types';
import { getClassById } from '@/lib/services/class.service';
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

  await peskidsClient()
    .from('class_enrollments')
    .update({ payment_provider: 'wompi', wompi_transaction_id: paymentLinkId })
    .eq('id', row.id);

  await peskidsClient().from('payments').insert({
    tenant_slug: tenantSlug(),
    family_user_id: input.familyUserId,
    enrollment_id: row.id,
    amount_cents: classItem.price_cents,
    currency: 'cop',
    status: 'pending',
    provider: 'wompi',
    wompi_transaction_id: paymentLinkId,
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
}): Promise<void> {
  if (input.status !== 'APPROVED') {
    return;
  }

  await peskidsClient()
    .from('class_enrollments')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      wompi_transaction_id: input.transactionId,
    })
    .eq('wompi_transaction_id', input.paymentLinkId);

  await peskidsClient()
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      wompi_transaction_id: input.transactionId,
    })
    .eq('wompi_transaction_id', input.paymentLinkId);
}

export function verifyWompiWebhookSignature(rawBody: string): WompiWebhookEvent | null {
  const wompiConfig = resolveWompiForTenant(tenantSlug());
  if (!wompiConfig?.enabled) return null;
  return verifyWompiWebhookSignatureGeneric(rawBody, wompiConfig.eventsSecret);
}
