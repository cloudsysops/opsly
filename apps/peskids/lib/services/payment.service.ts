import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseServer } from '@/lib/supabase';
import type { PaymentStatus } from '@/lib/class-types';
import { getClassById } from '@/lib/services/class.service';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

function stripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return 'https://peskids.op-sly.com';
}

export async function createCheckoutForEnrollment(input: {
  enrollmentId: string;
  familyUserId: string;
}): Promise<{ checkout_url: string; session_id: string }> {
  const secret = stripeSecretKey();
  if (!secret) {
    throw new Error('Stripe not configured');
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

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${appBaseUrl()}/familias/reservas?paid=1`);
  params.set('cancel_url', `${appBaseUrl()}/familias/clases?cancelled=1`);
  params.set('client_reference_id', row.id);
  params.set('metadata[tenant_slug]', tenantSlug());
  params.set('metadata[enrollment_id]', row.id);
  params.set('metadata[class_id]', row.class_id);
  params.set('line_items[0][price_data][currency]', classItem.currency || 'cop');
  params.set(
    'line_items[0][price_data][unit_amount]',
    String(classItem.price_cents)
  );
  params.set('line_items[0][price_data][product_data][name]', classItem.title);
  params.set('line_items[0][quantity]', '1');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe checkout failed: ${text.slice(0, 200)}`);
  }

  const session = (await response.json()) as {
    id: string;
    url: string;
  };

  await peskidsClient()
    .from('class_enrollments')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', row.id);

  await peskidsClient().from('payments').insert({
    tenant_slug: tenantSlug(),
    family_user_id: input.familyUserId,
    enrollment_id: row.id,
    amount_cents: classItem.price_cents,
    currency: classItem.currency || 'cop',
    status: 'pending',
    stripe_checkout_session_id: session.id,
    metadata: { class_id: row.class_id },
  });

  return { checkout_url: session.url, session_id: session.id };
}

export async function markEnrollmentPaidFromCheckout(input: {
  enrollmentId: string;
  sessionId: string;
  paymentIntentId?: string | null;
}): Promise<void> {
  await peskidsClient()
    .from('class_enrollments')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      stripe_checkout_session_id: input.sessionId,
    })
    .eq('id', input.enrollmentId);

  await peskidsClient()
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: input.paymentIntentId ?? null,
    })
    .eq('enrollment_id', input.enrollmentId)
    .eq('stripe_checkout_session_id', input.sessionId);
}

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
