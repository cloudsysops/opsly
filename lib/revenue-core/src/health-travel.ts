export const HEALTH_TRAVEL_REVENUE_EVENT_NAMES = [
  'health.lead.created',
  'health.consultation.scheduled',
  'health.quote.sent',
  'health.booking.started',
  'health.deposit.paid',
  'health.consultation.completed',
  'health.journey.completed',
] as const;

export type HealthTravelRevenueEventName =
  (typeof HEALTH_TRAVEL_REVENUE_EVENT_NAMES)[number];

export type HealthTravelRevenueEvent = Readonly<{
  externalEventId: string;
  eventType: HealthTravelRevenueEventName;
  tenantSlug: string;
  occurredAt: string;
  sourceSystem: 'smile-trip-care';
  dedupeKey?: string | null;
  data: Readonly<{
    lead_id: string;
    source?: string | null;
    provider_id?: string | null;
    package_id?: string | null;
    payment_id?: string | null;
    booking_id?: string | null;
    consultation_id?: string | null;
    amount_cents?: number | null;
    currency?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  }>;
}>;

export type HealthTravelReferralStatus =
  | 'referred'
  | 'qualified'
  | 'quoted'
  | 'booked'
  | 'converted';

export type HealthTravelRevenuePlan = Readonly<{
  receipt: {
    externalEventId: string;
    sourceSystem: 'smile-trip-care';
    eventType: HealthTravelRevenueEventName;
    leadRef: string;
    providerRef: string | null;
    offerRef: string | null;
    dedupeKey: string | null;
    occurredAt: string;
  };
  attribution: {
    attributionKey: string;
    source: string;
    campaign: string | null;
    channel: string | null;
    leadRef: string;
    firstTouchAt: string;
    lastTouchAt: string;
  };
  referral: null | {
    providerExternalRef: string;
    offerExternalRef: string | null;
    externalRef: string;
    status: HealthTravelReferralStatus;
    customerRef: string;
    convertedAt: string | null;
  };
  commissionSignal: null | {
    paymentRef: string | null;
    depositAmount: number | null;
    currency: string | null;
    requiresExplicitTerms: true;
  };
  reconciliationRequired: readonly string[];
}>;

function statusForEvent(eventType: HealthTravelRevenueEventName): HealthTravelReferralStatus {
  switch (eventType) {
    case 'health.lead.created':
      return 'referred';
    case 'health.consultation.scheduled':
    case 'health.consultation.completed':
      return 'qualified';
    case 'health.quote.sent':
      return 'quoted';
    case 'health.booking.started':
      return 'booked';
    case 'health.deposit.paid':
    case 'health.journey.completed':
      return 'converted';
  }
}

function finiteNonNegative(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Converts one canonical Health Travel event into a conservative Revenue Core plan.
 *
 * The plan deliberately never invents providers/offers/commission terms. Missing
 * external refs are surfaced through reconciliationRequired.
 */
export function planHealthTravelRevenueEvent(
  event: HealthTravelRevenueEvent
): HealthTravelRevenuePlan {
  const providerRef = event.data.provider_id?.trim() || null;
  const offerRef = event.data.package_id?.trim() || null;
  const leadRef = event.data.lead_id.trim();

  const reconciliationRequired: string[] = [];
  if (!providerRef && event.eventType !== 'health.lead.created') {
    reconciliationRequired.push('provider_ref_missing');
  }
  if (offerRef && !providerRef) {
    reconciliationRequired.push('offer_without_provider');
  }

  const attributionSource =
    event.data.utm_source?.trim() ||
    event.data.source?.trim() ||
    event.sourceSystem;

  const referral = providerRef
    ? {
        providerExternalRef: providerRef,
        offerExternalRef: offerRef,
        externalRef: `smiletripcare:lead:${leadRef}:provider:${providerRef}`,
        status: statusForEvent(event.eventType),
        customerRef: leadRef,
        convertedAt:
          event.eventType === 'health.deposit.paid' ||
          event.eventType === 'health.journey.completed'
            ? event.occurredAt
            : null,
      }
    : null;

  const commissionSignal =
    event.eventType === 'health.deposit.paid'
      ? {
          paymentRef: event.data.payment_id?.trim() || null,
          // Deposit is intentionally not called gross_value. The eventual adapter
          // may use it only when stored partner/offer terms explicitly define the
          // deposit as the commission basis.
          depositAmount:
            finiteNonNegative(event.data.amount_cents) === null
              ? null
              : finiteNonNegative(event.data.amount_cents)! / 100,
          currency: event.data.currency?.trim().toUpperCase() || null,
          requiresExplicitTerms: true as const,
        }
      : null;

  return {
    receipt: {
      externalEventId: event.externalEventId,
      sourceSystem: event.sourceSystem,
      eventType: event.eventType,
      leadRef,
      providerRef,
      offerRef,
      dedupeKey: event.dedupeKey?.trim() || null,
      occurredAt: event.occurredAt,
    },
    attribution: {
      attributionKey: `health-travel:${leadRef}`,
      source: attributionSource,
      campaign: event.data.utm_campaign?.trim() || null,
      channel: event.data.utm_medium?.trim() || null,
      leadRef,
      firstTouchAt: event.occurredAt,
      lastTouchAt: event.occurredAt,
    },
    referral,
    commissionSignal,
    reconciliationRequired,
  };
}
