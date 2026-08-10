import { beforeEach, describe, expect, it, vi } from 'vitest';

const isTwentyConfiguredMock = vi.hoisted(() => vi.fn());
const sendLeadToTwentyMock = vi.hoisted(() => vi.fn());
const resolveProvidersMock = vi.hoisted(() => vi.fn());
const shouldSyncLeadToTwentyMock = vi.hoisted(() => vi.fn());

vi.mock('@intcloudsysops/services', () => ({
  isTwentyConfigured: isTwentyConfiguredMock,
}));

vi.mock('@/lib/twenty-lead-sync', () => ({
  sendLeadToTwenty: sendLeadToTwentyMock,
}));

vi.mock('@/lib/integrations/peskids-provider-config', () => ({
  resolvePeskidsIntegrationProviders: resolveProvidersMock,
  shouldSyncLeadToTwenty: shouldSyncLeadToTwentyMock,
}));

import { syncLeadToCrm } from '@/lib/peskids-crm-sync';

describe('syncLeadToCrm', () => {
  beforeEach(() => {
    isTwentyConfiguredMock.mockReset();
    sendLeadToTwentyMock.mockReset();
    resolveProvidersMock.mockReset();
    shouldSyncLeadToTwentyMock.mockReset();
    resolveProvidersMock.mockReturnValue({
      crm: 'twenty',
      inbox: 'legacy',
      booking: 'legacy',
      explicitFlags: false,
    });
    isTwentyConfiguredMock.mockReturnValue(true);
    shouldSyncLeadToTwentyMock.mockReturnValue(true);
  });

  it('syncs to Twenty when configured', async () => {
    sendLeadToTwentyMock.mockResolvedValue({
      twentyPersonId: 'p-1',
      twentyOpportunityId: 'o-1',
    });

    const result = await syncLeadToCrm({
      parentName: 'Ana',
      email: 'ana@example.com',
      phone: '+573001112233',
    });

    expect(sendLeadToTwentyMock).toHaveBeenCalledOnce();
    expect(result.twentyPersonId).toBe('p-1');
    expect(result.twentyOpportunityId).toBe('o-1');
  });

  it('skips Twenty when shouldSyncLeadToTwenty is false', async () => {
    shouldSyncLeadToTwentyMock.mockReturnValue(false);

    const result = await syncLeadToCrm({
      parentName: 'Ana',
      email: 'ana@example.com',
    });

    expect(sendLeadToTwentyMock).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
