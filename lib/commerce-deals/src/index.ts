export type Money = {
  amount: number;
  currency: string;
};

export type NormalizedCommerceOffer = {
  source: 'medusa' | 'partner-api' | 'manual';
  externalId: string;
  title: string;
  status: 'active' | 'inactive' | 'unknown';
  productUrl?: string | null;
  imageUrl?: string | null;
  price?: Money | null;
  compareAtPrice?: Money | null;
  discountPercent?: number | null;
  inventoryState?: 'in_stock' | 'out_of_stock' | 'unknown';
  partnerRef?: string | null;
  metadata: Record<string, unknown>;
};

export type DealWatchEvent = {
  source: 'changedetection';
  watchId: string;
  eventType: 'price_drop' | 'price_increase' | 'restock' | 'out_of_stock' | 'content_change';
  occurredAt: string;
  targetUrl: string;
  previousValue?: string | number | null;
  currentValue?: string | number | null;
  currency?: string | null;
  offerRef?: string | null;
  evidenceRef?: string | null;
  metadata: Record<string, unknown>;
};

export type AttributionLinkRequest = {
  longUrl: string;
  campaign?: string | null;
  tags: string[];
  customSlug?: string | null;
  metadata: {
    tenantSlug: string;
    attributionKey: string;
    offerRef?: string | null;
    partnerRef?: string | null;
    agentTaskRequestId?: string | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asFinite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeCurrency(value: unknown): string {
  const code = asString(value)?.toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : 'USD';
}

function centsToMoney(value: unknown, currency: unknown): Money | null {
  const cents = asFinite(value);
  if (cents === null) return null;
  return {
    amount: Math.round((cents / 100 + Number.EPSILON) * 100) / 100,
    currency: normalizeCurrency(currency),
  };
}

export function normalizeMedusaProduct(input: unknown): NormalizedCommerceOffer {
  const row = asRecord(input);
  const variants = Array.isArray(row.variants) ? row.variants.map(asRecord) : [];
  const variant = variants[0] ?? {};
  const calculated = asRecord(variant.calculated_price);
  const price = centsToMoney(
    calculated.calculated_amount ?? variant.price ?? row.price,
    calculated.currency_code ?? row.currency_code,
  );
  const compareAt = centsToMoney(
    calculated.original_amount ?? variant.original_price ?? row.compare_at_price,
    calculated.currency_code ?? row.currency_code,
  );

  const priceValue = price?.amount ?? null;
  const compareValue = compareAt?.amount ?? null;
  const discountPercent =
    priceValue !== null && compareValue !== null && compareValue > priceValue && compareValue > 0
      ? Math.round(((compareValue - priceValue) / compareValue) * 10000) / 100
      : null;

  const inventoryQuantity =
    asFinite(variant.inventory_quantity) ?? asFinite(row.inventory_quantity);

  return {
    source: 'medusa',
    externalId: asString(row.id) ?? asString(row.handle) ?? 'unknown',
    title: asString(row.title) ?? asString(row.name) ?? 'Untitled offer',
    status:
      row.status === 'published' || row.status === 'active'
        ? 'active'
        : row.status === 'draft' || row.status === 'inactive'
          ? 'inactive'
          : 'unknown',
    productUrl: asString(row.url) ?? null,
    imageUrl: asString(row.thumbnail) ?? null,
    price,
    compareAtPrice: compareAt,
    discountPercent,
    inventoryState:
      inventoryQuantity === null
        ? 'unknown'
        : inventoryQuantity > 0
          ? 'in_stock'
          : 'out_of_stock',
    partnerRef: asString(row.partner_ref) ?? null,
    metadata: {
      handle: row.handle ?? null,
      variant_id: variant.id ?? null,
      raw_status: row.status ?? null,
    },
  };
}

export function normalizeChangeDetectionEvent(input: unknown): DealWatchEvent {
  const row = asRecord(input);
  const previous = row.previous_value ?? row.old_value ?? null;
  const current = row.current_value ?? row.new_value ?? null;
  const previousNumber = asFinite(previous);
  const currentNumber = asFinite(current);
  const explicit = asString(row.event_type)?.toLowerCase();

  let eventType: DealWatchEvent['eventType'] = 'content_change';
  if (
    explicit === 'restock' ||
    (String(previous).toLowerCase().includes('out of stock') &&
      String(current).toLowerCase().includes('in stock'))
  ) {
    eventType = 'restock';
  } else if (explicit === 'out_of_stock') {
    eventType = 'out_of_stock';
  } else if (explicit === 'price_drop' || (previousNumber !== null && currentNumber !== null && currentNumber < previousNumber)) {
    eventType = 'price_drop';
  } else if (explicit === 'price_increase' || (previousNumber !== null && currentNumber !== null && currentNumber > previousNumber)) {
    eventType = 'price_increase';
  }

  return {
    source: 'changedetection',
    watchId: asString(row.watch_id) ?? asString(row.uuid) ?? 'unknown',
    eventType,
    occurredAt: asString(row.occurred_at) ?? new Date().toISOString(),
    targetUrl: asString(row.url) ?? asString(row.target_url) ?? '',
    previousValue: typeof previous === 'string' || typeof previous === 'number' ? previous : null,
    currentValue: typeof current === 'string' || typeof current === 'number' ? current : null,
    currency: asString(row.currency)?.toUpperCase() ?? null,
    offerRef: asString(row.offer_ref) ?? null,
    evidenceRef: asString(row.evidence_ref) ?? null,
    metadata: {
      source_event_type: explicit,
      snapshot_ref: row.snapshot_ref ?? null,
    },
  };
}

export function buildShlinkAttributionRequest(input: {
  longUrl: string;
  tenantSlug: string;
  attributionKey: string;
  campaign?: string | null;
  offerRef?: string | null;
  partnerRef?: string | null;
  agentTaskRequestId?: string | null;
  customSlug?: string | null;
}): AttributionLinkRequest {
  if (!/^https?:\/\//i.test(input.longUrl)) {
    throw new Error('longUrl must be an absolute http(s) URL');
  }
  if (!/^[a-z0-9-]{3,64}$/.test(input.tenantSlug)) {
    throw new Error('tenantSlug is invalid');
  }
  if (!input.attributionKey.trim()) {
    throw new Error('attributionKey is required');
  }

  const tags = [
    `tenant:${input.tenantSlug}`,
    input.campaign ? `campaign:${input.campaign}` : null,
    input.offerRef ? `offer:${input.offerRef}` : null,
    input.partnerRef ? `partner:${input.partnerRef}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    longUrl: input.longUrl,
    campaign: input.campaign ?? null,
    tags,
    customSlug: input.customSlug ?? null,
    metadata: {
      tenantSlug: input.tenantSlug,
      attributionKey: input.attributionKey,
      offerRef: input.offerRef ?? null,
      partnerRef: input.partnerRef ?? null,
      agentTaskRequestId: input.agentTaskRequestId ?? null,
    },
  };
}

export function shouldCreateDealOpportunity(event: DealWatchEvent): {
  eligible: boolean;
  reason: string;
} {
  switch (event.eventType) {
    case 'price_drop':
      return { eligible: true, reason: 'price drop may create a sellable deal' };
    case 'restock':
      return { eligible: true, reason: 'restock may reopen a sellable offer' };
    case 'price_increase':
      return { eligible: false, reason: 'price increase is informational by default' };
    case 'out_of_stock':
      return { eligible: false, reason: 'offer cannot be sold while out of stock' };
    default:
      return { eligible: false, reason: 'generic content change requires review' };
  }
}
