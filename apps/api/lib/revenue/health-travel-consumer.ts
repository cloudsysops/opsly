/* eslint-disable @typescript-eslint/no-explicit-any */
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
};

type RevenueReferralRow = {
  id: string;
  status: string;
  converted_at: string | null;
};

export type HealthTravelRevenueConsumeResult = Readonly<{
  duplicate: boolean;
  receiptId: string;
  status: 'applied' | 'reconciliation_required';
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
}): { amount: number | null; currency: string; reconciliationReason: string | null } {
  const commissionValue = numberOrNull(params.offer.commission_value);
  const model = params.offer.commission_model;

  if (model === 'manual' || model === 'tiered') {
    return {
      amount: null,
      currency: params.offer.currency,
      reconciliationReason: 'commission_terms_require_manual_resolution',
    };
  }

  if (model === 'percentage') {
    const basis = params.offer.metadata?.commission_basis;
    if (basis !== 'deposit') {
      return {
        amount: null,
        currency: params.offer.currency,
        reconciliationReason: 'percentage_commission_basis_not_explicit',
      };
    }
    const quote = quoteCommission({
      model,
      commissionValue,
      grossValue: params.depositAmount,
    });
    return {
      amount: quote.amount,
      currency: params.offer.currency,
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
    currency: params.offer.currency,
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

async function getOrCreateReceipt(
  platform: PlatformDb,
  tenantId: string,
  event: HealthTravelRevenueEvent,
  plan: ReturnType<typeof planHealthTravelRevenueEvent>
): Promise<{ id: string; processing_status: string; attribution_id: string | null; referral_id: string | null; commission_event_id: string | null }> {
  const existing = await platform
    .from('revenue_event_receipts')
    .select('id, processing_status, attribution_id, referral_id, commission_event_id')
    .eq('tenant_id', tenantId)
    .eq('source_system', event.sourceSystem)
    .eq('external_event_id', event.externalEventId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Revenue receipt lookup failed: ${existing.error.message}`);
  }
  if (existing.data) return existing.data;

  const inserted = await platform
    .from('revenue_event_receipts')
    .insert({
      tenant_id: tenantId,
      source_system: event.sourceSystem,
      external_event_id: event.externalEventId,
      dedupe_key: plan.receipt.dedupeKey,
      event_type: event.eventType,
      lead_ref: plan.receipt.leadRef,
      provider_ref: plan.receipt.providerRef,
      offer_ref: plan.receipt.offerRef,
      processing_status: 'received',
      occurred_at: event.occurredAt,
      metadata: {},
    })
    .select('id, processing_status, attribution_id, referral_id, commission_event_id')
    .single();

  if (!inserted.error && inserted.data) return inserted.data;

  // A concurrent delivery may have won the unique(event) race.
  const raced = await platform
    .from('revenue_event_receipts')
    .select('id, processing_status, attribution_id, referral_id, commission_event_id')
    .eq('tenant_id', tenantId)
    .eq('source_system', event.sourceSystem)
    .eq('external_event_id', event.externalEventId)
    .maybeSingle();

  if (raced.error || !raced.data) {
    throw new Error(
      `Revenue receipt insert failed: ${inserted.error?.message ?? raced.error?.message ?? 'unknown'}`
    );
  }
  return raced.data;
}

async function upsertAttribution(
  platform: PlatformDb,
  tenantId: string,
  plan: ReturnType<typeof planHealthTravelRevenueEvent>
): Promise<string> {
  const existing = await platform
    .from('revenue_attributions')
    .select('id, first_touch_at, last_touch_at')
    .eq('tenant_id', tenantId)
    .eq('attribution_key', plan.attribution.attributionKey)
    .maybeSingle();

  if (existing.error) throw new Error(`Attribution lookup failed: ${existing.error.message}`);

  if (existing.data?.id) {
    const lastTouch = maxIso(
      String(existing.data.last_touch_at ?? plan.attribution.lastTouchAt),
      plan.attribution.lastTouchAt
    );
    const update = await platform
      .from('revenue_attributions')
      .update({
        last_touch_at: lastTouch,
        campaign: plan.attribution.campaign,
        channel: plan.attribution.channel,
      })
      .eq('id', existing.data.id);
    if (update.error) throw new Error(`Attribution update failed: ${update.error.message}`);
    return String(existing.data.id);
  }

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
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error(`Attribution insert failed: ${inserted.error?.message ?? 'missing id'}`);
  }
  return String(inserted.data.id);
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

async function resolveOffer(
  platform: PlatformDb,
  tenantId: string,
  partnerId: string,
  externalRef: string
): Promise<RevenueOfferRow | null> {
  const result = await platform
    .from('revenue_offers')
    .select('id, currency, commission_model, commission_value, metadata')
    .eq('tenant_id', tenantId)
    .eq('partner_id', partnerId)
    .eq('external_ref', externalRef)
    .eq('status', 'active')
    .maybeSingle();
  if (result.error) throw new Error(`Revenue offer lookup failed: ${result.error.message}`);
  return (result.data as RevenueOfferRow | null) ?? null;
}

async function upsertReferral(params: {
  platform: PlatformDb;
  tenantId: string;
  attributionId: string;
  partnerId: string;
  offerId: string | null;
  plan: ReturnType<typeof planHealthTravelRevenueEvent>;
  event: HealthTravelRevenueEvent;
}): Promise<string> {
  const referralPlan = params.plan.referral;
  if (!referralPlan) throw new Error('Referral plan required');

  const existing = await params.platform
    .from('revenue_referrals')
    .select('id, status, converted_at')
    .eq('tenant_id', params.tenantId)
    .eq('partner_id', params.partnerId)
    .eq('external_ref', referralPlan.externalRef)
    .maybeSingle();

  if (existing.error) throw new Error(`Referral lookup failed: ${existing.error.message}`);

  if (existing.data?.id) {
    const row = existing.data as RevenueReferralRow;
    const status = nextHealthTravelReferralStatus(row.status, referralPlan.status);
    const update = await params.platform
      .from('revenue_referrals')
      .update({
        attribution_id: params.attributionId,
        offer_id: params.offerId,
        status,
        converted_at:
          row.converted_at ??
          (status === 'converted' ? referralPlan.convertedAt ?? params.event.occurredAt : null),
        currency: params.event.data.currency?.toUpperCase() || undefined,
      })
      .eq('id', row.id);
    if (update.error) throw new Error(`Referral update failed: ${update.error.message}`);
    return row.id;
  }

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
      opportunity_ref: params.event.data.booking_id ?? params.event.data.consultation_id ?? null,
      gross_value: null,
      currency: params.event.data.currency?.toUpperCase() || 'USD',
      converted_at: referralPlan.convertedAt,
      metadata: { source_system: 'smile-trip-care' },
    })
    .select('id')
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error(`Referral insert failed: ${inserted.error?.message ?? 'missing id'}`);
  }
  return String(inserted.data.id);
}

async function maybeCreateCommissionEvent(params: {
  platform: PlatformDb;
  tenantId: string;
  partnerId: string;
  referralId: string;
  offer: RevenueOfferRow | null;
  event: HealthTravelRevenueEvent;
  plan: ReturnType<typeof planHealthTravelRevenueEvent>;
  reconciliation: string[];
}): Promise<string | null> {
  if (!params.plan.commissionSignal) return null;
  if (!params.offer) {
    params.reconciliation.push('commission_offer_unresolved');
    return null;
  }

  const quote = quoteHealthTravelCommission({
    offer: params.offer,
    depositAmount: params.plan.commissionSignal.depositAmount,
  });
  if (quote.reconciliationReason) {
    params.reconciliation.push(quote.reconciliationReason);
    return null;
  }
  if (quote.amount === null) return null;

  const externalRef = `health-event:${params.event.externalEventId}`;
  const existing = await params.platform
    .from('revenue_commission_events')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('referral_id', params.referralId)
    .eq('external_ref', externalRef)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Commission event lookup failed: ${existing.error.message}`);
  }
  if (existing.data?.id) return String(existing.data.id);

  const inserted = await params.platform
    .from('revenue_commission_events')
    .insert({
      tenant_id: params.tenantId,
      referral_id: params.referralId,
      partner_id: params.partnerId,
      event_type: 'estimated',
      amount: quote.amount,
      currency: quote.currency,
      source: 'smile-trip-care',
      external_ref: externalRef,
      occurred_at: params.event.occurredAt,
      metadata: {
        source_event_id: params.event.externalEventId,
        payment_ref: params.plan.commissionSignal.paymentRef,
        calculation: 'explicit_offer_terms',
      },
    })
    .select('id')
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error(
      `Commission event insert failed: ${inserted.error?.message ?? 'missing id'}`
    );
  }
  return String(inserted.data.id);
}

export async function consumeHealthTravelRevenueEvent(
  event: HealthTravelRevenueEvent
): Promise<HealthTravelRevenueConsumeResult> {
  const plan = planHealthTravelRevenueEvent(event);
  const platform = getServiceClient().schema('platform') as PlatformDb;
  const tenantId = await resolveTenantId(platform, event.tenantSlug);
  const receipt = await getOrCreateReceipt(platform, tenantId, event, plan);

  if (receipt.processing_status === 'applied') {
    return {
      duplicate: true,
      receiptId: String(receipt.id),
      status: 'applied',
      attributionId: receipt.attribution_id ? String(receipt.attribution_id) : null,
      referralId: receipt.referral_id ? String(receipt.referral_id) : null,
      commissionEventId: receipt.commission_event_id
        ? String(receipt.commission_event_id)
        : null,
      reconciliationRequired: [],
    };
  }

  const reconciliation = [...plan.reconciliationRequired];
  const attributionId = await upsertAttribution(platform, tenantId, plan);

  let referralId: string | null = null;
  let commissionEventId: string | null = null;

  if (plan.referral) {
    const partnerId = await resolvePartner(platform, tenantId, plan.referral.providerExternalRef);
    if (!partnerId) {
      reconciliation.push('provider_ref_unresolved');
    } else {
      let offer: RevenueOfferRow | null = null;
      if (plan.referral.offerExternalRef) {
        offer = await resolveOffer(
          platform,
          tenantId,
          partnerId,
          plan.referral.offerExternalRef
        );
        if (!offer) reconciliation.push('offer_ref_unresolved');
      }

      referralId = await upsertReferral({
        platform,
        tenantId,
        attributionId,
        partnerId,
        offerId: offer?.id ?? null,
        plan,
        event,
      });

      commissionEventId = await maybeCreateCommissionEvent({
        platform,
        tenantId,
        partnerId,
        referralId,
        offer,
        event,
        plan,
        reconciliation,
      });
    }
  }

  const status =
    reconciliation.length > 0 ? 'reconciliation_required' : 'applied';

  const update = await platform
    .from('revenue_event_receipts')
    .update({
      processing_status: status,
      attribution_id: attributionId,
      referral_id: referralId,
      commission_event_id: commissionEventId,
      processed_at: new Date().toISOString(),
      error_code: reconciliation[0] ?? null,
      metadata: { reconciliation_reasons: reconciliation },
    })
    .eq('id', receipt.id);

  if (update.error) throw new Error(`Revenue receipt update failed: ${update.error.message}`);

  return {
    duplicate: false,
    receiptId: String(receipt.id),
    status,
    attributionId,
    referralId,
    commissionEventId,
    reconciliationRequired: reconciliation,
  };
}
