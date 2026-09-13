/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { getServiceClient } from '../supabase/client';

const providerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider_type: z.enum(['clinic', 'specialist', 'tour_operator', 'hotel', 'transport', 'wellness']),
  city: z.string().min(1),
  country: z.string().min(1),
  approval_status: z.literal('approved'),
  published: z.literal(true),
}).strict();

const offerSchema = z.object({
  id: z.string().min(1),
  provider_id: z.string().min(1).nullable(),
  name: z.string().min(1),
  package_type: z.enum(['health', 'tour', 'combo']),
  location: z.string().min(1),
  recovery_city: z.string().nullable(),
  currency: z.string().length(3),
  price_from_usd: z.number().nonnegative().nullable(),
  published: z.literal(true),
}).strict();

export const healthTravelCatalogSchema = z.object({
  version: z.literal(1),
  source_system: z.literal('smile-trip-care'),
  generated_at: z.string().datetime(),
  providers: z.array(providerSchema),
  offers: z.array(offerSchema),
}).strict();

export type HealthTravelCatalog = z.infer<typeof healthTravelCatalogSchema>;

export function healthTravelProviderTypeToPartnerType(
  providerType: HealthTravelCatalog['providers'][number]['provider_type']
): 'health_provider' | 'travel_provider' {
  return ['tour_operator', 'hotel', 'transport'].includes(providerType)
    ? 'travel_provider'
    : 'health_provider';
}

export function healthTravelPackageTypeToOfferType(
  packageType: HealthTravelCatalog['offers'][number]['package_type']
): 'health' | 'travel' | 'service' {
  if (packageType === 'health') return 'health';
  if (packageType === 'tour') return 'travel';
  return 'service';
}

function countryCode(country: string): string | null {
  const normalized = country.trim().toLowerCase();
  if (normalized === 'colombia') return 'CO';
  if (/^[a-z]{2}$/i.test(country.trim())) return country.trim().toUpperCase();
  return null;
}

async function fetchCatalog(): Promise<HealthTravelCatalog> {
  const url = process.env.HEALTH_TRAVEL_CATALOG_URL?.trim() ?? '';
  const secret = process.env.HEALTH_TRAVEL_CATALOG_SECRET?.trim() ?? '';
  if (!url || !secret) {
    throw new Error('Health Travel catalog sync is not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Health Travel catalog returned HTTP ${response.status}`);
    }
    const json = await response.json();
    const parsed = healthTravelCatalogSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error('Health Travel catalog contract validation failed');
    }
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveTenantId(platform: any, tenantSlug: string): Promise<string> {
  const result = await platform
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .is('deleted_at', null)
    .maybeSingle();
  if (result.error) throw new Error(`Tenant lookup failed: ${result.error.message}`);
  if (!result.data?.id) throw new Error(`Unknown tenant: ${tenantSlug}`);
  return String(result.data.id);
}

export type HealthTravelCatalogSyncResult = Readonly<{
  tenant_slug: string;
  source_generated_at: string;
  providers: { created: number; updated: number };
  offers: { created: number; updated: number; skipped_unassigned: number };
}>;

export async function syncHealthTravelCatalog(
  tenantSlug = 'health-travel-colombia'
): Promise<HealthTravelCatalogSyncResult> {
  const catalog = await fetchCatalog();
  const platform = getServiceClient().schema('platform') as any;
  const tenantId = await resolveTenantId(platform, tenantSlug);

  let providerCreated = 0;
  let providerUpdated = 0;
  let offerCreated = 0;
  let offerUpdated = 0;
  let skippedUnassigned = 0;
  const partnerIds = new Map<string, string>();

  for (const provider of catalog.providers) {
    const existing = await platform
      .from('revenue_partners')
      .select('id, metadata')
      .eq('tenant_id', tenantId)
      .eq('external_ref', provider.id)
      .maybeSingle();
    if (existing.error) {
      throw new Error(`Partner lookup failed for ${provider.id}: ${existing.error.message}`);
    }

    const metadata = {
      ...(existing.data?.metadata && typeof existing.data.metadata === 'object'
        ? existing.data.metadata
        : {}),
      source_system: 'smile-trip-care',
      source_provider_type: provider.provider_type,
      city: provider.city,
      catalog_synced_at: new Date().toISOString(),
    };

    if (existing.data?.id) {
      const updated = await platform
        .from('revenue_partners')
        .update({
          name: provider.name,
          partner_type: healthTravelProviderTypeToPartnerType(provider.provider_type),
          status: 'active',
          country_code: countryCode(provider.country),
          default_currency: 'USD',
          metadata,
        })
        .eq('id', existing.data.id);
      if (updated.error) {
        throw new Error(`Partner update failed for ${provider.id}: ${updated.error.message}`);
      }
      providerUpdated += 1;
      partnerIds.set(provider.id, String(existing.data.id));
    } else {
      const inserted = await platform
        .from('revenue_partners')
        .insert({
          tenant_id: tenantId,
          external_ref: provider.id,
          name: provider.name,
          partner_type: healthTravelProviderTypeToPartnerType(provider.provider_type),
          status: 'active',
          country_code: countryCode(provider.country),
          default_currency: 'USD',
          commission_terms: {},
          metadata,
        })
        .select('id')
        .single();
      if (inserted.error || !inserted.data?.id) {
        throw new Error(
          `Partner insert failed for ${provider.id}: ${inserted.error?.message ?? 'missing id'}`
        );
      }
      providerCreated += 1;
      partnerIds.set(provider.id, String(inserted.data.id));
    }
  }

  for (const offer of catalog.offers) {
    if (!offer.provider_id) {
      skippedUnassigned += 1;
      continue;
    }
    const partnerId = partnerIds.get(offer.provider_id);
    if (!partnerId) {
      skippedUnassigned += 1;
      continue;
    }

    const existing = await platform
      .from('revenue_offers')
      .select('id, metadata')
      .eq('tenant_id', tenantId)
      .eq('partner_id', partnerId)
      .eq('external_ref', offer.id)
      .maybeSingle();
    if (existing.error) {
      throw new Error(`Offer lookup failed for ${offer.id}: ${existing.error.message}`);
    }

    const metadata = {
      ...(existing.data?.metadata && typeof existing.data.metadata === 'object'
        ? existing.data.metadata
        : {}),
      source_system: 'smile-trip-care',
      source_package_type: offer.package_type,
      location: offer.location,
      recovery_city: offer.recovery_city,
      catalog_synced_at: new Date().toISOString(),
    };

    const patch = {
      name: offer.name,
      offer_type: healthTravelPackageTypeToOfferType(offer.package_type),
      status: 'active',
      currency: offer.currency.toUpperCase(),
      price_from: offer.price_from_usd,
      price_to: null,
      metadata,
    };

    if (existing.data?.id) {
      // Deliberately do NOT update commission_model or commission_value.
      const updated = await platform
        .from('revenue_offers')
        .update(patch)
        .eq('id', existing.data.id);
      if (updated.error) {
        throw new Error(`Offer update failed for ${offer.id}: ${updated.error.message}`);
      }
      offerUpdated += 1;
    } else {
      const inserted = await platform
        .from('revenue_offers')
        .insert({
          tenant_id: tenantId,
          partner_id: partnerId,
          external_ref: offer.id,
          ...patch,
          commission_model: 'manual',
          commission_value: null,
        });
      if (inserted.error) {
        throw new Error(`Offer insert failed for ${offer.id}: ${inserted.error.message}`);
      }
      offerCreated += 1;
    }
  }

  return {
    tenant_slug: tenantSlug,
    source_generated_at: catalog.generated_at,
    providers: { created: providerCreated, updated: providerUpdated },
    offers: {
      created: offerCreated,
      updated: offerUpdated,
      skipped_unassigned: skippedUnassigned,
    },
  };
}
