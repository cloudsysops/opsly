/**
 * Unified provider flags for Peskids CRM / inbox / booking.
 *
 * When PESKIDS_*_PROVIDER is unset, `legacy` means Twenty CRM (if configured)
 * + WA CRM inbox defaults. legacy CRM is no longer a supported provider.
 */

export type PeskidsCrmProvider = 'twenty' | 'espocrm' | 'legacy';
export type PeskidsInboxProvider = 'chatwoot' | 'wacrm' | 'legacy';
export type PeskidsBookingProvider = 'calcom' | 'legacy';

export type PeskidsIntegrationProviders = {
  crm: PeskidsCrmProvider;
  inbox: PeskidsInboxProvider;
  booking: PeskidsBookingProvider;
  /** True when any PESKIDS_*_PROVIDER env var is set explicitly. */
  explicitFlags: boolean;
};

type Env = Record<string, string | undefined>;

const CRM_VALUES = new Set<PeskidsCrmProvider>(['twenty', 'espocrm']);
const INBOX_VALUES = new Set<PeskidsInboxProvider>(['chatwoot', 'wacrm']);
const BOOKING_VALUES = new Set<PeskidsBookingProvider>(['calcom']);

function normalizeProvider<T extends string>(
  raw: string | undefined,
  allowed: Set<T>
): T | 'legacy' {
  const value = raw?.trim().toLowerCase();
  if (!value) {
    return 'legacy';
  }
  // Reject retired legacy CRM provider values as legacy (Twenty path).
  if (value === 'ghl' || value === 'legacy-crm') {
    return 'legacy';
  }
  if (allowed.has(value as T)) {
    return value as T;
  }
  return 'legacy';
}

export function resolvePeskidsIntegrationProviders(
  env: Env = process.env as Env
): PeskidsIntegrationProviders {
  const crmRaw = env.PESKIDS_CRM_PROVIDER;
  const inboxRaw = env.PESKIDS_INBOX_PROVIDER;
  const bookingRaw = env.PESKIDS_BOOKING_PROVIDER;

  const explicitFlags =
    Boolean(crmRaw?.trim()) || Boolean(inboxRaw?.trim()) || Boolean(bookingRaw?.trim());

  return {
    crm: normalizeProvider(crmRaw, CRM_VALUES),
    inbox: normalizeProvider(inboxRaw, INBOX_VALUES),
    booking: normalizeProvider(bookingRaw, BOOKING_VALUES),
    explicitFlags,
  };
}

/** Whether outbound lead sync should call Twenty (respects legacy + explicit twenty). */
export function shouldSyncLeadToTwenty(
  providers: PeskidsIntegrationProviders,
  twentyConfigured: boolean
): boolean {
  if (!twentyConfigured) {
    return false;
  }
  if (providers.crm === 'twenty' || providers.crm === 'legacy') {
    return true;
  }
  return false;
}

/** Documented defaults when operators set flags explicitly. */
export const PESKIDS_PROVIDER_DEFAULTS = {
  crm: 'twenty',
  inbox: 'wacrm',
  booking: 'calcom',
} as const;
