/**
 * Webhook idempotency ledger.
 *
 * Stripe and Wompi both retry deliveries, and n8n/Jelou can replay. Without a
 * ledger nothing prevents a redelivery from re-running a business write.
 *
 * The claim is a plain INSERT against a UNIQUE (provider, event_id) index, so
 * the database — not application logic — decides who wins a concurrent race:
 * exactly one caller gets `duplicate: false`.
 *
 * Call `claimWebhookEvent()` BEFORE doing any work, and `markWebhookEvent...()`
 * after, so a crashed handler leaves a visible `claimed` row rather than a
 * silently-lost event.
 */
import { supabaseServerUntypedSchema } from '@/lib/supabase';

export type WebhookProvider = 'stripe' | 'wompi' | 'jelou' | 'wacrm' | 'openwa' | 'n8n';

export type WebhookClaim =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true }
  /** The ledger itself is unavailable — the caller must fail closed. */
  | { ok: false; error: string };

const UNIQUE_VIOLATION = '23505';
const TENANT_SLUG = 'peskids';

/**
 * The `peskids.webhook_events` table is created by migration
 * 20260905_payment_atomicity_and_webhook_idempotency.sql. Until `db:codegen` is
 * re-run against a database with that migration applied, the generated
 * `Database` type does not know it, so this uses the untyped-schema handle
 * rather than `any`.
 */
function ledger() {
  return supabaseServerUntypedSchema().schema('peskids');
}

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || TENANT_SLUG).trim().toLowerCase();
}

/**
 * Claims one delivery. `duplicate: true` means this exact event was already
 * seen and the caller must not repeat the business write.
 */
export async function claimWebhookEvent(input: {
  provider: WebhookProvider;
  eventId: string;
  eventType?: string | null;
  requestId?: string | null;
  eventCreatedAt?: string | null;
}): Promise<WebhookClaim> {
  const eventId = input.eventId.trim();
  if (eventId.length === 0) {
    return { ok: false, error: 'missing_event_id' };
  }

  const { error } = await ledger()
    .from('webhook_events')
    .insert({
      tenant_slug: tenantSlug(),
      provider: input.provider,
      event_id: eventId,
      event_type: input.eventType ?? null,
      request_id: input.requestId ?? null,
      event_created_at: input.eventCreatedAt ?? null,
      status: 'claimed',
    });

  if (!error) {
    return { ok: true, duplicate: false };
  }

  if (error.code === UNIQUE_VIOLATION) {
    return { ok: true, duplicate: true };
  }

  console.error(
    JSON.stringify({
      component: 'peskids.webhook',
      event: 'idempotency_claim_failed',
      provider: input.provider,
      request_id: input.requestId ?? null,
      error_code: error.code ?? 'unknown',
    })
  );
  return { ok: false, error: 'ledger_unavailable' };
}

async function settle(
  provider: WebhookProvider,
  eventId: string,
  status: 'processed' | 'failed' | 'ignored',
  errorCode?: string
): Promise<void> {
  const { error } = await ledger()
    .from('webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_code: errorCode ?? null,
    })
    .eq('provider', provider)
    .eq('event_id', eventId);

  if (error) {
    // Never fail the webhook response because the ledger could not be updated —
    // the business write already happened and the provider must not retry.
    console.warn(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'idempotency_settle_failed',
        provider,
        status,
        error_code: error.code ?? 'unknown',
      })
    );
  }
}

export async function markWebhookEventProcessed(
  provider: WebhookProvider,
  eventId: string
): Promise<void> {
  await settle(provider, eventId, 'processed');
}

export async function markWebhookEventIgnored(
  provider: WebhookProvider,
  eventId: string
): Promise<void> {
  await settle(provider, eventId, 'ignored');
}

/**
 * Releases a claim after the business write failed, so the provider's retry can
 * claim it again.
 *
 * Leaving a `failed` row in place would make every retry look like a duplicate
 * and the payment would never be recorded — the ledger must not turn a
 * transient failure into permanent data loss.
 */
export async function releaseWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
  errorCode: string
): Promise<void> {
  console.error(
    JSON.stringify({
      component: 'peskids.webhook',
      event: 'idempotency_claim_released',
      provider,
      error_code: errorCode,
    })
  );

  const { error } = await ledger()
    .from('webhook_events')
    .delete()
    .eq('provider', provider)
    .eq('event_id', eventId)
    .eq('status', 'claimed');

  if (error) {
    console.warn(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'idempotency_release_failed',
        provider,
        error_code: error.code ?? 'unknown',
      })
    );
  }
}
