import type {
  PeskidsBookingProvider,
  PeskidsCrmProvider,
  PeskidsInboxProvider,
  PeskidsIntegrationProviders,
} from './peskids-provider-config';
import { resolvePeskidsIntegrationProviders } from './peskids-provider-config';

export type CrmContactLinks = {
  provider: PeskidsCrmProvider;
  twentyPersonUrl: string | null;
};

export type InboxRoutingHint = {
  provider: PeskidsInboxProvider;
  webhookPath: string | null;
  notes: string;
};

export type BookingRoutingHint = {
  provider: PeskidsBookingProvider;
  calendarSource: 'calcom' | 'manual';
};

type Env = Record<string, string | undefined>;

function trimUrl(base: string | undefined): string {
  return (base ?? '').trim().replace(/\/$/, '');
}

/**
 * Deep links for admin "open in CRM" (Twenty).
 * Does not perform network I/O.
 */
export function resolveCrmContactLinks(
  ids: {
    twentyPersonId?: string | null;
  },
  env: Env = process.env as Env
): CrmContactLinks {
  const { crm } = resolvePeskidsIntegrationProviders(env);
  const twentyBase = trimUrl(env.TWENTY_API_URL ?? env.TWENTY_PESKIDS_API_URL);

  const twentyPersonUrl =
    ids.twentyPersonId && twentyBase
      ? `${twentyBase}/objects/people/${ids.twentyPersonId}`
      : null;

  return {
    provider: crm,
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
  return {
    provider: 'legacy',
    calendarSource: 'manual',
  };
}

export function describeIntegrationProviders(
  providers: PeskidsIntegrationProviders = resolvePeskidsIntegrationProviders()
): string {
  return `crm=${providers.crm};inbox=${providers.inbox};booking=${providers.booking};explicit=${providers.explicitFlags}`;
}

export type IntegrationStatusSnapshot = {
  providers: PeskidsIntegrationProviders;
  crmLinks: CrmContactLinks;
  inbox: InboxRoutingHint;
  booking: BookingRoutingHint;
};

export function buildIntegrationStatusSnapshot(
  crmIds: {
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
