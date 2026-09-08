import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseServer, supabaseServerUntypedSchema } from '@/lib/supabase';
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
  return 'https://www.peskids.com';
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
  params.set('line_items[0][price_data][unit_amount]', String(classItem.price_cents));
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

  // Atomic: stamp the session on the enrollment AND create the pending payment
  // in one transaction. Previously these were two PostgREST calls, so a failure
  // between them left a live Stripe session with no payment row — the webhook's
  // UPDATE then matched nothing and the family was charged without confirmation.
  await recordCheckoutSession({
    enrollmentId: row.id,
    familyUserId: input.familyUserId,
    provider: 'stripe',
    sessionId: session.id,
    amountCents: classItem.price_cents,
    currency: classItem.currency || 'cop',
    metadata: { class_id: row.class_id },
  });

  return { checkout_url: session.url, session_id: session.id };
}

/**
 * Atomically records a provider checkout session against an enrollment.
 * Shared by the Stripe and Wompi services; see migration
 * 20260905_payment_atomicity_and_webhook_idempotency.sql.
 */
export async function recordCheckoutSession(input: {
  enrollmentId: string;
  familyUserId: string;
  provider: 'stripe' | 'wompi';
  sessionId: string;
  amountCents: number;
  currency: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseServerUntypedSchema()
    .schema('peskids')
    .rpc('record_checkout_session', {
      p_enrollment_id: input.enrollmentId,
      p_family_user_id: input.familyUserId,
      p_provider: input.provider,
      p_session_id: input.sessionId,
      p_amount_cents: input.amountCents,
      p_currency: input.currency,
      p_tenant_slug: tenantSlug(),
      p_metadata: input.metadata ?? {},
    });

  if (error) {
    throw new Error(`record_checkout_session failed: ${error.code ?? 'unknown'}`);
  }
}

export type MarkPaidResult = { enrollmentId: string; alreadyPaid: boolean };

/**
 * Atomically marks an enrollment (and its payment row) paid.
 *
 * `alreadyPaid` lets the caller distinguish a genuine first confirmation from a
 * replayed/duplicate provider delivery, without either one leaving the two rows
 * in disagreement.
 */
export async function markEnrollmentPaidBySession(input: {
  provider: 'stripe' | 'wompi';
  sessionId: string;
  transactionId?: string | null;
}): Promise<MarkPaidResult> {
  const { data, error } = await supabaseServerUntypedSchema()
    .schema('peskids')
    .rpc('mark_enrollment_paid', {
      p_provider: input.provider,
      p_session_id: input.sessionId,
      p_transaction_id: input.transactionId ?? null,
      p_tenant_slug: tenantSlug(),
    });

  if (error) {
    throw new Error(`mark_enrollment_paid failed: ${error.code ?? 'unknown'}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const typed = row as { enrollment_id?: string; already_paid?: boolean } | null | undefined;

  return {
    enrollmentId: typed?.enrollment_id ?? '',
    alreadyPaid: typed?.already_paid === true,
  };
}

export async function markEnrollmentPaidFromCheckout(input: {
  sessionId: string;
  paymentIntentId?: string | null;
}): Promise<MarkPaidResult> {
  return markEnrollmentPaidBySession({
    provider: 'stripe',
    sessionId: input.sessionId,
    transactionId: input.paymentIntentId ?? null,
  });
}

/** Stripe's own recommended tolerance for the signed timestamp. */
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

export type StripeSignatureResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: 'not_configured' | 'malformed' | 'bad_signature' | 'stale' };

/**
 * Verifies a Stripe webhook signature, including the replay window.
 *
 * The previous implementation checked the HMAC but ignored `t`, so a captured
 * delivery stayed valid forever — an attacker who ever observed one valid
 * `checkout.session.completed` body could replay it indefinitely.
 */
export function verifyStripeWebhookSignatureDetailed(
  payload: string,
  signatureHeader: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = STRIPE_SIGNATURE_TOLERANCE_SECONDS
): StripeSignatureResult {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return { ok: false, reason: 'not_configured' };
  if (!signatureHeader) return { ok: false, reason: 'malformed' };

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value && acc[key.trim()] === undefined) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestampRaw = parts.t;
  const signature = parts.v1;
  if (!timestampRaw || !signature) return { ok: false, reason: 'malformed' };

  const timestamp = Number.parseInt(timestampRaw, 10);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'malformed' };

  const signedPayload = `${timestampRaw}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  let signatureMatches = false;
  try {
    signatureMatches = timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    signatureMatches = false;
  }
  if (!signatureMatches) return { ok: false, reason: 'bad_signature' };

  // Replay window is checked only after the signature, so a wrong-secret probe
  // cannot learn anything from the timing of the freshness check.
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: 'stale' };
  }

  return { ok: true, timestamp };
}

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null
): boolean {
  return verifyStripeWebhookSignatureDetailed(payload, signatureHeader).ok;
}
