/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import {
  planHealthTravelRevenueEvent,
  quoteCommission,
  type CommissionModel,
  type HealthTravelReferralStatus,
  type HealthTravelRevenueEvent,
} from '@intcloudsysops/revenue-core';
import { getServiceClient } from '../supabase/client';

type PlatformDb = any;

type RevenueOfferRow = {
  id: string;
  currency: string;
  commission_model: CommissionModel;
  commission_value: number | string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
};

type RevenueReferralRow = {
  id: string;
  status: string;
  converted_at: string | null;
  offer_id: string | null;
  updated_at: string;
};

type RevenueAttributionRow = {
  id: string;
  first_touch_at: string;
  last_touch_at: string;
  campaign: string | null;
  channel: string | null;
};

type RevenueReceiptRow = {
  id: string;
  processing_status: string;
  processing_started_at: string | null;
  claim_token: string | null;
  attribution_id: string | null;
  referral_id: string | null;
  commission_event_id: string | null;
  event_type: string;
  lead_ref: string;
  business_dedupe_key: string | null;
  metadata: Record<string, unknown> | null;
};

type ReferralUpsertResult = {
  id: string;
  status: string;
  offerId: string | null;
};

export type HealthTravelRevenueConsumeResult = Readonly<{
  duplicate: boolean;
  receiptId: string;
  status: 'processing' | 'applied' | 'reconciliation_required';
  attributionId: string | null;
  referralId: string | null;
  commissionEventId: string | null;
  reconciliationRequired: readonly string[];
}>;

const REFERRAL_STATUS_RANK: Record<HealthTravelReferralStatus, number> = {
  referred: 1,
  qualified: 2,
  quoted: 3,
  booked: 4,
  converted: 5,
};

const RECEIPT_CLAIM_LEASE_MS = 5 * 60 * 1000;
const CAS_ATTEMPTS = 5;

function minIso(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

function maxIso(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function reconciliationFromReceipt(receipt: RevenueReceiptRow): string[] {
  const reasons = receipt.metadata?.reconciliation_reasons;
  if (!Array.isArray(reasons)) return [];
  return reasons.filter((value): value is string => typeof value === 'string');
}

export function nextHealthTravelReferralStatus(
  current: string,
  incoming: HealthTravelReferralStatus
): string {
  if (current === 'lost' || current === 'cancelled' || current === 'converted') {
    return current;
  }
  const currentRank =
    current in REFERRAL_STATUS_RANK
      ? REFERRAL_STATUS_RANK[current as HealthTravelReferralStatus]
      : 0;
  return REFERRAL_STATUS_RANK[incoming] > currentRank ? incoming : current;
}

export function quoteHealthTravelCommission(params: {
  offer: RevenueOfferRow;
  depositAmount: number | null;
  depositCurrency?: string | null;
}): { amount: number | null; currency: string; reconciliationReason: string | null } {
  const commissionValue = numberOrNull(params.offer.commission_value);
  const model = params.offer.commission_model;
  const offerCurrency = params.offer.currency.trim().toUpperCase();

  if (model === 'manual' || model === 'tiered') {
    return {
      amount: null,
      currency: offerCurrency,
      reconciliationReason: 'commission_terms_require_manual_resolution',
    };
  }

  if (model === 'percentage') {
    const basis = params.offer.metadata?.commission_basis;
    if (basis !== 'deposit') {
      return {
        amount: null,
        currency: offerCurrency,
        reconciliationReason: 'percentage_commission_basis_not_explicit',
      };
    }

    const depositCurrency = params.depositCurrency?.trim().toUpperCase() || null;
    if (!depositCurrency || depositCurrency !== offerCurrency) {
      return {
        amount: null,
        currency: offerCurrency,
        reconciliationReason: 'percentage_commission_currency_mismatch_or_missing',
      };
    }

    const quote = quoteCommission({
      model,
      commissionValue,
      grossValue: params.depositAmount,
    });
    return {
      amount: quote.amount,
      currency: offerCurrency,
      reconciliationReason:
        quote.amount === null ? 'percentage_commission_cannot_be_calculated' : null,
    };
  }

  const quote = quoteCommission({
    model,
    commissionValue,
  });
  return {
    amount: quote.amount,
    currency: offerCurrency,
    reconciliationReason:
      quote.amount === null ? 'flat_commission_cannot_be_calculated' : null,
  };
}

async function resolveTenantId(platform: PlatformDb, slug: string): Promise<string> {
  const { data, error } = await platform
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Health Travel tenant lookup failed: ${error.message}`);
  if (!data?.id) throw new Error(`Unknown Health Travel tenant: ${slug}`);
  return String(data.id);
}

function assertReceiptIdentity(
  receipt: RevenueReceiptRow,
  plan: ReturnType<typeof planHealthTravelRevenueEvent>
): void {
  if (
    receipt.event_type !== plan.receipt.eventType ||
    receipt.lead_ref !== plan.receipt.leadRef ||
    (receipt.business_dedupe_key &&
      plan.receipt.businessDedupeKey &&
      receipt.business_dedupe_key !== plan.receipt.businessDedupeKey)
  ) {
    throw new Error('Health Travel receipt identity collision');
  }
}

async function findReceipt(
  platform: PlatformDb,
  tenantId: string,
  event: HealthTravelRevenueEvent,
  plan: ReturnType<typeof planHealthTravelRevenueEvent>
): Promise<RevenueReceiptRow | null> {
  const select =
    'id, processing_status, processing_started_at, claim_token, attribution_id, referral_id, commission_event_id, event_type, lead_ref, business_dedupe_key, metadata';

  const byExternal = await platform
    .from('revenue_event_receipts')
    .select(select)
    .eq('tenant_id', tenantId)
    .eq('source_system', event.sourceSystem)
    .eq('external_event_id', plan.receipt.externalEventId)
    .maybeSingle();

  if (byExternal.error) {
    throw new Error(`Revenue receipt lookup failed: ${byExternal.error.message}`);
  }
  if (byExternal.data) {
    const row = byExternal.data as RevenueReceiptRow;
    assertReceiptIdentity(row, plan);
    return row;
  }

  if (!plan.receipt.businessDedupeKey) return null;

  const byBusinessIdentity = await platform
    .from('revenue_event_receipts')
    .select(select)
    .eq('tenant_id', tenantId)
    .eq('source_system', event.sourceSystem)
    .eq('business_dedupe_key', plan.receipt.businessDedupeKey)
    .maybeSingle();

  if (byBusinessIdentity.error) {
    throw new Error(
      `Revenue receipt business identity lookup failed: ${byBusinessIdentity.error.message}`
    );
  }
  if (!byBusinessIdentity.data) return null;

  const row = byBusinessIdentity.data as RevenueReceiptRow;
  assertReceiptIdentity(row, plan);
  return row;
}

async function getOrCreateReceipt(
  platform: PlatformDb,
  tenantId: string,
  event: HealthTravelRevenueEvent,
  plan: ReturnType<typeof planHealthTravelRevenueEvent>
): Promise<RevenueReceiptRow> {
  const existing = await findReceipt(platform, tenantId, event, plan);
  if (existing) return existing;

  const inserted = await platform
    .from('revenue_event_receipts')
    .insert({
      tenant_id: tenantId,
      source_system: event.sourceSystem,
      external_event_id: plan.receipt.externalEventId,
      business_dedupe_key: plan.receipt.businessDedupeKey,
      dedupe_key: plan.receipt.dedupeKey,
      event_type: plan.receipt.eventType,
      lead_ref: plan.receipt.leadRef,
      provider_ref: plan.receipt.providerRef,
      offer_ref: plan.receipt.offerRef,
      payment_ref: plan.receipt.paymentRef,
      processing_status: 'received',
      occurred_at: plan.receipt.occurredAt,
      metadata: {},
    })
    .select(
      'id, processing_status, processing_started_at, claim_token, attribution_id, referral_id, commission_event_id, event_type, lead_ref, business_dedupe_key, metadata'
    )
    .single();

  if (!inserted.error && inserted.data) {
    return inserted.data as RevenueReceiptRow;
  }

  // Concurrent event-id or business-identity delivery may have won a unique race.
  const raced = await findReceipt(platform, tenantId, event, plan);
  if (!raced) {
    throw new Error(
      `Revenue receipt insert failed: ${inserted.error?.message ?? 'unknown'}`
    );
  }
  return raced;
}

async function tryClaimReceiptStatus(params: {
  platform: PlatformDb;
  tenantId: string;
  receipt: RevenueReceiptRow;
  expectedStatus: string;
  claimToken: string;
  nowIso: string;
  requireOldLease?: boolean;
}): Promise<RevenueReceiptRow | null> {
  let query = params.platform
    .from('revenue_event_receipts')
    .update({
      processing_status: 'processing',
      claim_token: params.claimToken,
      processing_started_at: params.nowIso,
      processed_at: null,
      error_code: null,
    })
    .eq('id', params.receipt.id)
    .eq('tenant_id', params.tenantId)
    .eq('processing_status', params.expectedStatus);

  if (params.requireOldLease) {
    query = params.receipt.processing_started_at
      ? query.eq('processing_started_at', params.receipt.processing_started_at)
      : query.is('processing_started_at', null);
    query = params.receipt.claim_token
      ? query.eq('claim_token', params.receipt.claim_token)
      : query.is('claim_token', null);
  }

  const result = await query
    .select(
      'id, processing_status, processing_started_at, claim_token, attribution_id, referral_id, commission_event_id, event_type, lead_ref, business_dedupe_key, metadata'
    )
    .maybeSingle();

  if (result.error) {
    throw new Error(`Revenue receipt claim failed: ${result.error.message}`);
  }
  return (result.data as RevenueReceiptRow | null) ?? null;
}

async function claimReceipt(
  platform: PlatformDb,
  tenantId: string,
  receipt: RevenueReceiptRow
): Promise<{ claimed: boolean; receipt: RevenueReceiptRow; claimToken: string | null }> {
  const claimToken = randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();

  if (receipt.processing_status === 'received' || receipt.processing_status === 'failed') {
    const claimed = await tryClaimReceiptStatus({
      platform,
      tenantId,
      receipt,
      expectedStatus: receipt.processing_status,
      claimToken,
      nowIso,
    });
    if (claimed) return { claimed: true, receipt: claimed, claimToken };
  }

  if (receipt.processing_status === 'processing') {
    const started = receipt.processing_started_at
      ? Date.parse(receipt.processing_started_at)
      : Number.NaN;
    const stale = !Number.isFinite(started) || now.getTime() - started >= RECEIPT_CLAIM_LEASE_MS;
    if (stale) {
      const reclaimed = await tryClaimReceiptStatus({
        platform,
        tenantId,
        receipt,
        expectedStatus: 'processing',
        claimToken,
        nowIso,
        requireOldLease: true,
      });
      if (reclaimed) return { claimed: true, receipt: reclaimed, claimToken };
    }
  }

  const current = await platform
    .from('revenue_event_receipts')
    .select(
      'id, processing_status, processing_started_at, claim_token, attribution_id, referral_id, commission_event_id, event_type, lead_ref, business_dedupe_key, metadata'
    )
    .eq('id', receipt.id)
    .eq('tenant_id', tenantId)
    .single();

  if (current.error || !current.data) {
    throw new Error(
      `Revenue receipt reload after claim race failed: ${current.error?.message ?? 'missing row'}`
    );
  }
  return { claimed: false, receipt: current.data as RevenueReceiptRow, claimToken: null };
}

export function mergeHealthTravelAttributionFacts(
  existing: {
    first_touch_at: string;
    last_touch_at: string;
    campaign: string | null;
    channel: string | null;
  },
  incoming: {
    firstTouchAt: string;
    lastTouchAt: string;
    campaign: string | null;
    channel: string | null;
  }
) {
  return {
    first_touch_at: minIso(existing.first_touch_at, incoming.firstTouchAt),
    last_touch_at: maxIso(existing.last_touch_at, incoming.lastTouchAt),
    campaign: existing.campaign ?? incoming.campaign,
    channel: existing.channel ?? incoming.channel,
  };
}

export function mergeHealthTravelReferralState(
  existing: {
    status: string;
    converted_at: string | null;
    offer_id: string | null;
  },
  incoming: {
    status: HealthTravelReferralStatus;
    convertedAt: string | null;
    offerId: string | null;
    occurredAt: string;
  }
) {
  const status = nextHealthTravelReferralStatus(existing.status, incoming.status);
  return {
    status,
    offerId: incoming.offerId ?? existing.offer_id ?? null,
    convertedAt:
      existing.converted_at ??
      (status === 'converted' ? incoming.convertedAt ?? incoming.occurredAt : null),
  };
}

async function upsertAttribution(
  platform: PlatformDb,
  tenantId: string,
  plan: ReturnType<typeof planHealthTravelRevenueEvent>
): Promise<string> {
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const existing = await platform
      .from('revenue_attributions')
      .select('id, first_touch_at, last_touch_at, campaign, channel')
      .eq('tenant_id', tenantId)
      .eq('attribution_key', plan.attribution.attributionKey)
      .maybeSingle();

    if (existing.error) {
      throw new Error(`Attribution lookup failed: ${existing.error.message}`);
    }

    if (!existing.data?.id) {
      const inserted = await platform
        .from('revenue_attributions')
        .insert({
          tenant_id: tenantId,
          attribution_key: plan.attribution.attributionKey,
          source: plan.attribution.source,
          campaign: plan.attribution.campaign,
          channel: plan.attribution.channel,
          lead_ref: plan.attribution.leadRef,
          first_touch_at: plan.attribution.firstTouchAt,
          last_touch_at: plan.attribution.lastTouchAt,
          metadata: { source_system: 'smile-trip-care' },
        })
        .select('id')
        .maybeSingle();

      if (!inserted.error && inserted.data?.id) return String(inserted.data.id);
      // A concurrent insert can win the unique key; retry the merge path.
      continue;
    }

    const row = existing.data as RevenueAttributionRow;
    const updatePayload = mergeHealthTravelAttributionFacts(row, plan.attribution);

    let update = platform
      .from('revenue_attributions')
      .update(updatePayload)
      .eq('id', row.id)
      .eq('tenant_id', tenantId)
      .eq('first_touch_at', row.first_touch_at)
      .eq('last_touch_at', row.last_touch_at);

    update = row.campaign === null ? update.is('campaign', null) : update.eq('campaign', row.campaign);
    update = row.channel === null ? update.is('channel', null) : update.eq('channel', row.channel);

    const updated = await update.select('id').maybeSingle();
    if (updated.error) throw new Error(`Attribution update failed: ${updated.error.message}`);
    if (updated.data?.id) return String(updated.data.id);
  }

  throw new Error('Attribution update failed after concurrent retries');
}

async function resolvePartner(platform: PlatformDb, tenantId: string, externalRef: string) {
  const result = await platform
    .from('revenue_partners')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('external_ref', externalRef)
    .eq('status', 'active')
    .maybeSingle();
  if (result.error) throw new Error(`Revenue partner lookup failed: ${result.error.message}`);
  return result.data?.id ? String(result.data.id) : null;
}

export function validateOfferAtEventTime(
  offer: RevenueOfferRow,
  occurredAt: string
): string | null {
  const eventMs = Date.parse(occurredAt);
  const validFromMs = offer.valid_from ? Date.parse(offer.valid_from) : null;
  const validUntilMs = offer.valid_until ? Date.parse(offer.valid_until) : null;

  if (
    (validFromMs !== null && !Number.isFinite(validFromMs)) ||
    (validUntilMs !== null && !Number.isFinite(validUntilMs))
  ) {
    return 'offer_terms_validity_invalid';
  }
  if (offer.status === 'draft') {
    return 'offer_terms_not_activated';
  }
  // Automated commission requires an explicit effective-from boundary so replay
  // does not depend on whatever status the offer happens to have today.
  if (validFromMs === null) {
    return 'offer_terms_validity_missing';
  }
  if (eventMs < validFromMs) {
    return 'offer_terms_not_yet_valid_at_event_time';
  }
  if (validUntilMs !== null && eventMs > validUntilMs) {
    return 'offer_terms_expired_at_event_time';
  }
  return null;
}

async function resolveOfferBy(
  platform: PlatformDb,
  params: {
    tenantId: string;
    partnerId: string;
    externalRef?: string;
    offerId?: string;
    occurredAt: string;
  }
): Promise<{ offer: RevenueOfferRow | null; reconciliationReason: string | null }> {
  let query = platform
    .from('revenue_offers')
    .select(
      'id, currency, commission_model, commission_value, metadata, status, valid_from, valid_until'
    )
    .eq('tenant_id', params.tenantId)
    .eq('partner_id', params.partnerId);

  query = params.offerId
    ? query.eq('id', params.offerId)
    : query.eq('external_ref', params.externalRef);

  const result = await query.maybeSingle();
  if (result.error) throw new Error(`Revenue offer lookup failed: ${result.error.message}`);
  if (!result.data) return { offer: null, reconciliationReason: 'offer_ref_unresolved' };

  const offer = result.data as RevenueOfferRow;
  const temporalReason = validateOfferAtEventTime(offer, params.occurredAt);
  if (temporalReason) return { offer: null, reconciliationReason: temporalReason };
  return { offer, reconciliationReason: null };
}

async function upsertReferral(params: {
  platform: PlatformDb;
  tenantId: string;
  attributionId: string;
  partnerId: string;
  offerId: string | null;
  plan: ReturnType<typeof planHealthTravelRevenueEvent>;
  event: HealthTravelRevenueEvent;
}): Promise<ReferralUpsertResult> {
  const referralPlan = params.plan.referral;
  if (!referralPlan) throw new Error('Referral plan required');

  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const existing = await params.platform
      .from('revenue_referrals')
      .select('id, status, converted_at, offer_id, updated_at')
      .eq('tenant_id', params.tenantId)
      .eq('partner_id', params.partnerId)
      .eq('external_ref', referralPlan.externalRef)
      .maybeSingle();

    if (existing.error) throw new Error(`Referral lookup failed: ${existing.error.message}`);

    if (!existing.data?.id) {
      const inserted = await params.platform
        .from('revenue_referrals')
        .insert({
          tenant_id: params.tenantId,
          attribution_id: params.attributionId,
          partner_id: params.partnerId,
          offer_id: params.offerId,
          external_ref: referralPlan.externalRef,
          status: referralPlan.status,
          customer_ref: referralPlan.customerRef,
          opportunity_ref:
            params.event.data.booking_id ?? params.event.data.consultation_id ?? null,
          gross_value: null,
          currency: params.event.data.currency?.trim().toUpperCase() || 'USD',
          converted_at: referralPlan.convertedAt,
          metadata: { source_system: 'smile-trip-care' },
        })
        .select('id, status, offer_id')
        .maybeSingle();

      if (!inserted.error && inserted.data?.id) {
        return {
          id: String(inserted.data.id),
          status: String(inserted.data.status),
          offerId: inserted.data.offer_id ? String(inserted.data.offer_id) : null,
        };
      }
      // Concurrent insert may have won; retry so this event still advances the row.
      continue;
    }

    const row = existing.data as RevenueReferralRow;
    const merged = mergeHealthTravelReferralState(row, {
      status: referralPlan.status,
      convertedAt: referralPlan.convertedAt,
      offerId: params.offerId,
      occurredAt: params.event.occurredAt,
    });
    const updatePayload: Record<string, unknown> = {
      attribution_id: params.attributionId,
      offer_id: merged.offerId,
      status: merged.status,
      converted_at: merged.convertedAt,
    };
    const incomingCurrency = params.event.data.currency?.trim().toUpperCase();
    if (incomingCurrency) updatePayload.currency = incomingCurrency;

    const updated = await params.platform
      .from('revenue_referrals')
      .update(updatePayload)
      .eq('id', row.id)
      .eq('tenant_id', params.tenantId)
      .eq('updated_at', row.updated_at)
      .select('id, status, offer_id')
      .maybeSingle();

    if (updated.error) throw new Error(`Referral update failed: ${updated.error.message}`);
    if (updated.data?.id) {
      return {
        id: String(updated.data.id),
        status: String(updated.data.status),
        offerId: updated.data.offer_id ? String(updated.data.offer_id) : null,
      };
    }
  }

  throw new Error('Referral update failed after concurrent retries');
}

export function commissionExternalRef(params: {
  offer: RevenueOfferRow;
  referralId: string;
  paymentIdentity: string | null;
}): { externalRef: string | null; reconciliationReason: string | null } {
  if (params.offer.commission_model === 'flat') {
    return {
      externalRef: `health-flat-referral:${params.referralId}`,
      reconciliationReason: null,
    };
  }

  if (params.offer.commission_model === 'percentage') {
    if (!params.paymentIdentity) {
      return { externalRef: null, reconciliationReason: 'payment_identity_missing' };
    }
    return {
      externalRef: `health-payment:${params.paymentIdentity}`,
      reconciliationReason: null,
    };
  }

  return { externalRef: null, reconciliationReason: 'commission_terms_require_manual_resolution' };
}

async function maybeCreateCommissionEvent(params: {
  platform: PlatformDb;
  tenantId: string;
  partnerId: string;
  referral: ReferralUpsertResult;
  offer: RevenueOfferRow | null;
  event: HealthTravelRevenueEvent;
  plan: ReturnType<typeof planHealthTravelRevenueEvent>;
  reconciliation: string[];
}): Promise<string | null> {
  const signal = params.plan.commissionSignal;
  if (!signal) return null;

  if (params.referral.status !== 'converted') {
    pushUnique(params.reconciliation, 'deposit_for_terminal_or_nonconverted_referral');
    return null;
  }

  if (!signal.paymentIdentity) {
    pushUnique(params.reconciliation, 'payment_identity_missing');
    return null;
  }

  if (!params.offer) {
    pushUnique(params.reconciliation, 'commission_offer_unresolved');
    return null;
  }

  const quote = quoteHealthTravelCommission({
    offer: params.offer,
    depositAmount: signal.depositAmount,
    depositCurrency: signal.currency,
  });
  if (quote.reconciliationReason) {
    pushUnique(params.reconciliation, quote.reconciliationReason);
    return null;
  }
  if (quote.amount === null) return null;

  const identity = commissionExternalRef({
    offer: params.offer,
    referralId: params.referral.id,
    paymentIdentity: signal.paymentIdentity,
  });
  if (!identity.externalRef) {
    if (identity.reconciliationReason) {
      pushUnique(params.reconciliation, identity.reconciliationReason);
    }
    return null;
  }

  const existing = await params.platform
    .from('revenue_commission_events')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('referral_id', params.referral.id)
    .eq('source', 'smile-trip-care')
    .eq('external_ref', identity.externalRef)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Commission event lookup failed: ${existing.error.message}`);
  }
  if (existing.data?.id) return String(existing.data.id);

  const inserted = await params.platform
    .from('revenue_commission_events')
    .insert({
      tenant_id: params.tenantId,
      referral_id: params.referral.id,
      partner_id: params.partnerId,
      event_type: 'estimated',
      amount: quote.amount,
      currency: quote.currency,
      source: 'smile-trip-care',
      external_ref: identity.externalRef,
      occurred_at: params.event.occurredAt,
      metadata: {
        source_event_id: params.plan.receipt.externalEventId,
        payment_ref: signal.paymentRef,
        payment_identity: signal.paymentIdentity,
        calculation: 'explicit_offer_terms',
        commission_model: params.offer.commission_model,
      },
    })
    .select('id')
    .maybeSingle();

  if (!inserted.error && inserted.data?.id) return String(inserted.data.id);

  // A concurrent worker may have won the business-idempotency unique key.
  const raced = await params.platform
    .from('revenue_commission_events')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('referral_id', params.referral.id)
    .eq('source', 'smile-trip-care')
    .eq('external_ref', identity.externalRef)
    .maybeSingle();

  if (raced.error || !raced.data?.id) {
    throw new Error(
      `Commission event insert failed: ${inserted.error?.message ?? raced.error?.message ?? 'missing id'}`
    );
  }
  return String(raced.data.id);
}

async function finalizeReceipt(params: {
  platform: PlatformDb;
  tenantId: string;
  receiptId: string;
  claimToken: string;
  status: 'applied' | 'reconciliation_required';
  attributionId: string | null;
  referralId: string | null;
  commissionEventId: string | null;
  reconciliation: string[];
}): Promise<void> {
  const update = await params.platform
    .from('revenue_event_receipts')
    .update({
      processing_status: params.status,
      attribution_id: params.attributionId,
      referral_id: params.referralId,
      commission_event_id: params.commissionEventId,
      processed_at: new Date().toISOString(),
      processing_started_at: null,
      claim_token: null,
      error_code: params.reconciliation[0] ?? null,
      metadata: { reconciliation_reasons: params.reconciliation },
    })
    .eq('id', params.receiptId)
    .eq('tenant_id', params.tenantId)
    .eq('processing_status', 'processing')
    .eq('claim_token', params.claimToken)
    .select('id')
    .maybeSingle();

  if (update.error) throw new Error(`Revenue receipt update failed: ${update.error.message}`);
  if (!update.data?.id) throw new Error('Revenue receipt lease lost before finalization');
}

async function markReceiptFailed(params: {
  platform: PlatformDb;
  tenantId: string;
  receiptId: string;
  claimToken: string;
}): Promise<void> {
  await params.platform
    .from('revenue_event_receipts')
    .update({
      processing_status: 'failed',
      processed_at: new Date().toISOString(),
      processing_started_at: null,
      claim_token: null,
      error_code: 'consumer_exception',
    })
    .eq('id', params.receiptId)
    .eq('tenant_id', params.tenantId)
    .eq('processing_status', 'processing')
    .eq('claim_token', params.claimToken);
}

function duplicateResult(receipt: RevenueReceiptRow): HealthTravelRevenueConsumeResult {
  const status =
    receipt.processing_status === 'applied'
      ? 'applied'
      : receipt.processing_status === 'reconciliation_required'
        ? 'reconciliation_required'
        : 'processing';

  return {
    duplicate: true,
    receiptId: String(receipt.id),
    status,
    attributionId: receipt.attribution_id ? String(receipt.attribution_id) : null,
    referralId: receipt.referral_id ? String(receipt.referral_id) : null,
    commissionEventId: receipt.commission_event_id
      ? String(receipt.commission_event_id)
      : null,
    reconciliationRequired: reconciliationFromReceipt(receipt),
  };
}

export async function consumeHealthTravelRevenueEvent(
  event: HealthTravelRevenueEvent
): Promise<HealthTravelRevenueConsumeResult> {
  // Planning validates the external identity before any DB read/write.
  const plan = planHealthTravelRevenueEvent(event);
  const platform = getServiceClient().schema('platform') as PlatformDb;
  const tenantId = await resolveTenantId(platform, event.tenantSlug);
  const receipt = await getOrCreateReceipt(platform, tenantId, event, plan);
  const claim = await claimReceipt(platform, tenantId, receipt);

  if (!claim.claimed || !claim.claimToken) {
    return duplicateResult(claim.receipt);
  }

  try {
    const reconciliation = [...plan.reconciliationRequired];
    const attributionId = await upsertAttribution(platform, tenantId, plan);

    let referral: ReferralUpsertResult | null = null;
    let commissionEventId: string | null = null;

    if (plan.referral) {
      const partnerId = await resolvePartner(
        platform,
        tenantId,
        plan.referral.providerExternalRef
      );
      if (!partnerId) {
        pushUnique(reconciliation, 'provider_ref_unresolved');
      } else {
        let incomingOffer: RevenueOfferRow | null = null;
        if (plan.referral.offerExternalRef) {
          const resolved = await resolveOfferBy(platform, {
            tenantId,
            partnerId,
            externalRef: plan.referral.offerExternalRef,
            occurredAt: plan.receipt.occurredAt,
          });
          incomingOffer = resolved.offer;
          if (resolved.reconciliationReason) {
            pushUnique(reconciliation, resolved.reconciliationReason);
          }
        }

        referral = await upsertReferral({
          platform,
          tenantId,
          attributionId,
          partnerId,
          offerId: incomingOffer?.id ?? null,
          plan,
          event,
        });

        let effectiveOffer = incomingOffer;
        // If a later event omits package_id, retain and resolve the referral's stored offer.
        if (!plan.referral.offerExternalRef && referral.offerId) {
          const resolvedStored = await resolveOfferBy(platform, {
            tenantId,
            partnerId,
            offerId: referral.offerId,
            occurredAt: plan.receipt.occurredAt,
          });
          effectiveOffer = resolvedStored.offer;
          if (resolvedStored.reconciliationReason) {
            pushUnique(reconciliation, resolvedStored.reconciliationReason);
          }
        }

        commissionEventId = await maybeCreateCommissionEvent({
          platform,
          tenantId,
          partnerId,
          referral,
          offer: effectiveOffer,
          event,
          plan,
          reconciliation,
        });
      }
    }

    const status =
      reconciliation.length > 0 ? 'reconciliation_required' : 'applied';

    await finalizeReceipt({
      platform,
      tenantId,
      receiptId: claim.receipt.id,
      claimToken: claim.claimToken,
      status,
      attributionId,
      referralId: referral?.id ?? null,
      commissionEventId,
      reconciliation,
    });

    return {
      duplicate: false,
      receiptId: String(claim.receipt.id),
      status,
      attributionId,
      referralId: referral?.id ?? null,
      commissionEventId,
      reconciliationRequired: reconciliation,
    };
  } catch (error) {
    await markReceiptFailed({
      platform,
      tenantId,
      receiptId: claim.receipt.id,
      claimToken: claim.claimToken,
    });
    throw error;
  }
}
