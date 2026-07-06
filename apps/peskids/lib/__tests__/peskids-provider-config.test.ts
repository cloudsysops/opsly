import { describe, expect, it } from 'vitest';
import {
  PESKIDS_PROVIDER_DEFAULTS,
  resolvePeskidsIntegrationProviders,
  shouldSyncLeadToGhl,
  shouldSyncLeadToTwenty,
} from '@/lib/integrations/peskids-provider-config';
import {
  buildIntegrationStatusSnapshot,
  resolveCrmContactLinks,
  resolveInboxRoutingHint,
} from '@/lib/integrations/peskids-provider-adapters';

describe('resolvePeskidsIntegrationProviders', () => {
  it('returns legacy when provider env vars are unset', () => {
    const providers = resolvePeskidsIntegrationProviders({});
    expect(providers.crm).toBe('legacy');
    expect(providers.inbox).toBe('legacy');
    expect(providers.booking).toBe('legacy');
    expect(providers.explicitFlags).toBe(false);
  });

  it('parses explicit provider values', () => {
    const providers = resolvePeskidsIntegrationProviders({
      PESKIDS_CRM_PROVIDER: 'twenty',
      PESKIDS_INBOX_PROVIDER: 'wacrm',
      PESKIDS_BOOKING_PROVIDER: 'calcom',
    });
    expect(providers.crm).toBe('twenty');
    expect(providers.inbox).toBe('wacrm');
    expect(providers.booking).toBe('calcom');
    expect(providers.explicitFlags).toBe(true);
  });

  it('routes chatwoot pilot to placeholder webhook path', () => {
    const hint = resolveInboxRoutingHint({ PESKIDS_INBOX_PROVIDER: 'chatwoot' });
    expect(hint.provider).toBe('chatwoot');
    expect(hint.webhookPath).toContain('chatwoot');
  });

  it('falls back to legacy on unknown provider token', () => {
    const providers = resolvePeskidsIntegrationProviders({
      PESKIDS_CRM_PROVIDER: 'salesforce',
    });
    expect(providers.crm).toBe('legacy');
  });
});

describe('shouldSyncLeadToTwenty / shouldSyncLeadToGhl', () => {
  const legacy = resolvePeskidsIntegrationProviders({});
  const crmTwenty = resolvePeskidsIntegrationProviders({ PESKIDS_CRM_PROVIDER: 'twenty' });
  const crmGhl = resolvePeskidsIntegrationProviders({ PESKIDS_CRM_PROVIDER: 'ghl' });

  it('legacy mode syncs Twenty when configured', () => {
    expect(shouldSyncLeadToTwenty(legacy, true)).toBe(true);
    expect(shouldSyncLeadToTwenty(legacy, false)).toBe(false);
  });

  it('legacy mode syncs GHL only when enabled flag is true', () => {
    expect(shouldSyncLeadToGhl(legacy, true)).toBe(true);
    expect(shouldSyncLeadToGhl(legacy, false)).toBe(false);
  });

  it('explicit twenty skips GHL even if enabled', () => {
    expect(shouldSyncLeadToTwenty(crmTwenty, true)).toBe(true);
    expect(shouldSyncLeadToGhl(crmTwenty, true)).toBe(false);
  });

  it('explicit ghl skips Twenty even if configured', () => {
    expect(shouldSyncLeadToTwenty(crmGhl, true)).toBe(false);
    expect(shouldSyncLeadToGhl(crmGhl, true)).toBe(true);
  });
});

describe('resolveCrmContactLinks', () => {
  it('builds GHL deep link when location id is present', () => {
    const links = resolveCrmContactLinks(
      { ghlContactId: 'contact-1' },
      {
        GOHIGHLEVEL_PESKIDS_LOCATION_ID: 'loc-abc',
        GOHIGHLEVEL_APP_URL: 'https://app.gohighlevel.com',
      }
    );
    expect(links.ghlContactUrl).toContain('loc-abc');
    expect(links.ghlContactUrl).toContain('contact-1');
  });

  it('builds Twenty person URL when API base is set', () => {
    const links = resolveCrmContactLinks(
      { twentyPersonId: 'person-99' },
      { TWENTY_API_URL: 'https://crm-peskids.op-sly.com' }
    );
    expect(links.twentyPersonUrl).toBe(
      'https://crm-peskids.op-sly.com/objects/people/person-99'
    );
  });
});

describe('resolveInboxRoutingHint', () => {
  it('defaults to legacy inbound path', () => {
    const hint = resolveInboxRoutingHint({});
    expect(hint.provider).toBe('legacy');
    expect(hint.webhookPath).toBe('/api/webhooks/inbound');
  });

  it('routes wacrm inbox to canonical webhook path', () => {
    const hint = resolveInboxRoutingHint({ PESKIDS_INBOX_PROVIDER: 'wacrm' });
    expect(hint.provider).toBe('wacrm');
    expect(hint.webhookPath).toBe('/api/webhooks/wacrm');
  });
});

describe('buildIntegrationStatusSnapshot', () => {
  it('documents recommended defaults separately from runtime legacy', () => {
    expect(PESKIDS_PROVIDER_DEFAULTS.crm).toBe('ghl');
    expect(PESKIDS_PROVIDER_DEFAULTS.inbox).toBe('wacrm');
    const snapshot = buildIntegrationStatusSnapshot({}, {});
    expect(snapshot.providers.crm).toBe('legacy');
  });
});
