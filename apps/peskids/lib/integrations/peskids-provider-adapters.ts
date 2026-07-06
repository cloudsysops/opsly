import type {
  PeskidsBookingProvider,
  PeskidsCrmProvider,
  PeskidsInboxProvider,
  PeskidsIntegrationProviders,
} from './peskids-provider-config';
import { resolvePeskidsIntegrationProviders } from './peskids-provider-config';

export type CrmContactLinks = {
  provider: PeskidsCrmProvider;
  ghlContactUrl: string | null;
  twentyPersonUrl: string | null;
};

export type InboxRoutingHint = {
  provider: PeskidsInboxProvider;
  webhookPath: string | null;
  notes: string;
};

export type BookingRoutingHint = {
  provider: PeskidsBookingProvider;
  calendarSource: 'ghl' | 'calcom' | 'manual';
};

type Env = Record<string, string | undefined>;

function trimUrl(base: string | undefined): string {
  return (base ?? '').trim().replace(/\/$/, '');
}

/**
 * Deep links for admin "open in CRM" (Step 1 — GHL bridge visible).
 * Does not perform network I/O.
 */
export function resolveCrmContactLinks(
  ids: {
    ghlContactId?: string | null;
    twentyPersonId?: string | null;
  },
  env: Env = process.env as Env
): CrmContactLinks {
  const { crm } = resolvePeskidsIntegrationProviders(env);
  const ghlLocationId = env.GOHIGHLEVEL_PESKIDS_LOCATION_ID?.trim();
  const ghlAppBase = trimUrl(env.GOHIGHLEVEL_APP_URL) || 'https://app.gohighlevel.com';
  const twentyBase = trimUrl(env.TWENTY_API_URL ?? env.TWENTY_PESKIDS_API_URL);

  const ghlContactUrl =
    ids.ghlContactId && ghlLocationId
      ? `${ghlAppBase}/v2/location/${ghlLocationId}/contacts/detail/${ids.ghlContactId}`
      : ids.ghlContactId
        ? `${ghlAppBase}/contacts/${ids.ghlContactId}`
        : null;

  const twentyPersonUrl =
    ids.twentyPersonId && twentyBase
      ? `${twentyBase}/objects/people/${ids.twentyPersonId}`
      : null;

  return {
    provider: crm,
    ghlContactUrl,
    twentyPersonUrl,
  };
}

/** Read-only hint for inbox routing — no side effects. */
export function resolveInboxRoutingHint(
  env: Env = process.env as Env
): InboxRoutingHint {
  const providers = resolvePeskidsIntegrationProviders(env);
  const inbox = providers.inbox;

  if (inbox === 'chatwoot') {
    return {
      provider: inbox,
      webhookPath: '/api/webhooks/chatwoot',
      notes: 'Pilot only — Chatwoot webhook adapter not deployed; use n8n bridge.',
    };
  }

  if (inbox === 'wacrm') {
    return {
      provider: inbox,
      webhookPath: '/api/webhooks/wacrm',
      notes: 'Canonical open-source inbox path in repo (see WACRM-TWENTY-CUTOVER.md).',
    };
  }

  if (inbox === 'ghl') {
    return {
      provider: inbox,
      webhookPath: '/api/webhooks/gohighlevel',
      notes: 'Legacy GHL conversations; requires PESKIDS_GHL_ENABLED=true.',
    };
  }

  return {
    provider: 'legacy',
    webhookPath: '/api/webhooks/inbound',
    notes: 'Legacy multi-channel: inbound/jelou/openwa until PESKIDS_INBOX_PROVIDER is set.',
  };
}

/** Read-only hint for trial/booking calendar source. */
export function resolveBookingRoutingHint(
  env: Env = process.env as Env
): BookingRoutingHint {
  const { booking } = resolvePeskidsIntegrationProviders(env);

  if (booking === 'calcom') {
    return { provider: booking, calendarSource: 'calcom' };
  }
  if (booking === 'ghl') {
    return { provider: booking, calendarSource: 'ghl' };
  }
  return {
    provider: 'legacy',
    calendarSource: 'ghl',
  };
}

export type IntegrationStatusSnapshot = {
  providers: PeskidsIntegrationProviders;
  crmLinks: CrmContactLinks;
  inbox: InboxRoutingHint;
  booking: BookingRoutingHint;
};

export function buildIntegrationStatusSnapshot(
  crmIds: {
    ghlContactId?: string | null;
    twentyPersonId?: string | null;
  },
  env: Env = process.env as Env
): IntegrationStatusSnapshot {
  const providers = resolvePeskidsIntegrationProviders(env);
  return {
    providers,
    crmLinks: resolveCrmContactLinks(crmIds, env),
    inbox: resolveInboxRoutingHint(env),
    booking: resolveBookingRoutingHint(env),
  };
}
