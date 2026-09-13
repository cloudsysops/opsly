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
    paymentRef: string | null;
    dedupeKey: string | null;
    businessDedupeKey: string | null;
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
    paymentIdentity: string | null;
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

function requireNonBlank(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid Health Travel event: ${field} must be non-empty`);
  }
  return value.trim();
}

function requireIsoTimestamp(value: unknown): string {
  const normalized = requireNonBlank(value, 'occurredAt');
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error('Invalid Health Travel event: occurredAt must be an ISO timestamp');
  }
  return normalized;
}

/**
 * Converts one canonical Health Travel event into a conservative Revenue Core plan.
 *
 * Validation happens before any DB work. The plan deliberately never invents
 * providers/offers/commission terms; missing or contradictory commercial facts
 * become reconciliation work rather than money-bearing writes.
 */
export function planHealthTravelRevenueEvent(
  event: HealthTravelRevenueEvent
): HealthTravelRevenuePlan {
  const externalEventId = requireNonBlank(event?.externalEventId, 'externalEventId');
  const tenantSlug = requireNonBlank(event?.tenantSlug, 'tenantSlug');
  if (event?.sourceSystem !== 'smile-trip-care') {
    throw new Error('Invalid Health Travel event: unsupported sourceSystem');
  }
  if (!HEALTH_TRAVEL_REVENUE_EVENT_NAMES.includes(event?.eventType)) {
    throw new Error('Invalid Health Travel event: unsupported eventType');
  }
  const occurredAt = requireIsoTimestamp(event?.occurredAt);
  const leadRef = requireNonBlank(event?.data?.lead_id, 'data.lead_id');

  const providerRef = event.data.provider_id?.trim() || null;
  const offerRef = event.data.package_id?.trim() || null;
  const paymentRef = event.data.payment_id?.trim() || null;
  const dedupeKey = event.dedupeKey?.trim() || null;
  const normalizedCurrency = event.data.currency?.trim().toUpperCase() || null;
  const paymentIdentity = paymentRef
    ? `payment:${paymentRef}`
    : dedupeKey
      ? `dedupe:${dedupeKey}`
      : null;

  const businessDedupeKey =
    event.eventType === 'health.deposit.paid'
      ? paymentIdentity
        ? `deposit:${paymentIdentity}`
        : null
      : dedupeKey
        ? `${event.eventType}:dedupe:${dedupeKey}`
        : null;

  const reconciliationRequired: string[] = [];
  if (!providerRef && event.eventType !== 'health.lead.created') {
    reconciliationRequired.push('provider_ref_missing');
  }
  if (offerRef && !providerRef) {
    reconciliationRequired.push('offer_without_provider');
  }
  if (event.eventType === 'health.deposit.paid' && !paymentIdentity) {
    reconciliationRequired.push('payment_identity_missing');
  }
  if (
    event.eventType === 'health.deposit.paid' &&
    event.data.amount_cents != null &&
    finiteNonNegative(event.data.amount_cents) === null
  ) {
    reconciliationRequired.push('deposit_amount_invalid');
  }
  if (
    event.eventType === 'health.deposit.paid' &&
    normalizedCurrency !== null &&
    !/^[A-Z]{3}$/.test(normalizedCurrency)
  ) {
    reconciliationRequired.push('deposit_currency_invalid');
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
            ? occurredAt
            : null,
      }
    : null;

  const commissionSignal =
    event.eventType === 'health.deposit.paid'
      ? {
          paymentRef,
          paymentIdentity,
          // Deposit is intentionally not called gross_value. The adapter may use
          // it only when stored offer terms explicitly define deposit as the basis.
          depositAmount:
            finiteNonNegative(event.data.amount_cents) === null
              ? null
              : finiteNonNegative(event.data.amount_cents)! / 100,
          currency: normalizedCurrency,
          requiresExplicitTerms: true as const,
        }
      : null;

  // tenantSlug is validated here even though the planner does not persist it.
  void tenantSlug;

  return {
    receipt: {
      externalEventId,
      sourceSystem: event.sourceSystem,
      eventType: event.eventType,
      leadRef,
      providerRef,
      offerRef,
      paymentRef,
      dedupeKey,
      businessDedupeKey,
      occurredAt,
    },
    attribution: {
      attributionKey: `health-travel:${leadRef}`,
      source: attributionSource,
      campaign: event.data.utm_campaign?.trim() || null,
      channel: event.data.utm_medium?.trim() || null,
      leadRef,
      firstTouchAt: occurredAt,
      lastTouchAt: occurredAt,
    },
    referral,
    commissionSignal,
    reconciliationRequired,
  };
}
