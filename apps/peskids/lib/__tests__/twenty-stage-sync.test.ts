import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const updateOpportunityMock = vi.fn();
const resolveTwentyEnvMock = vi.fn();
const platformUpdateMock = vi.fn();

vi.mock('@intcloudsysops/services/twenty', () => {
  class MockTwentyClient {
    updateOpportunity = updateOpportunityMock;
  }
  return {
    TwentyClient: MockTwentyClient,
    resolveTwentyEnv: (...args: unknown[]) => resolveTwentyEnvMock(...args),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    schema: () => ({
      from: () => ({
        update: (patch: unknown) => {
          platformUpdateMock(patch);
          return {
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        },
      }),
    }),
  }),
}));

import { syncLeadStageToTwenty } from '@/lib/twenty-stage-sync';

describe('syncLeadStageToTwenty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveTwentyEnvMock.mockReturnValue({
      enabled: true,
      apiKey: 'key',
      baseUrl: 'https://crm.example.com',
      defaultOpportunityStage: 'NEW',
    });
    updateOpportunityMock.mockResolvedValue({ id: 'opp-1', stage: 'CONTACTED' });
  });

  afterEach(() => {
    delete process.env.PESKIDS_TWENTY_ENABLED;
  });

  it('skips when Twenty is disabled', async () => {
    resolveTwentyEnvMock.mockReturnValue({
      enabled: false,
      apiKey: '',
      baseUrl: '',
      defaultOpportunityStage: 'NEW',
    });
    const result = await syncLeadStageToTwenty({
      leadId: 'lead-1',
      tenantSlug: 'peskids',
      adminStatus: 'contacted',
      twentyOpportunityId: 'opp-1',
    });
    expect(result.status).toBe('skipped');
    expect(updateOpportunityMock).not.toHaveBeenCalled();
  });

  it('skips and records state when opportunity id is missing', async () => {
    const result = await syncLeadStageToTwenty({
      leadId: 'lead-1',
      tenantSlug: 'peskids',
      adminStatus: 'contacted',
      twentyOpportunityId: null,
    });
    expect(result.status).toBe('skipped');
    expect(updateOpportunityMock).not.toHaveBeenCalled();
    expect(platformUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        twenty_sync_status: 'skipped',
      })
    );
  });

  it('patches opportunity stage and marks synced', async () => {
    const result = await syncLeadStageToTwenty({
      leadId: 'lead-1',
      tenantSlug: 'peskids',
      adminStatus: 'contacted',
      twentyOpportunityId: 'opp-1',
    });
    expect(result).toMatchObject({
      ok: true,
      status: 'synced',
      stage: 'CONTACTED',
    });
    expect(updateOpportunityMock).toHaveBeenCalledWith('opp-1', { stage: 'CONTACTED' });
    expect(platformUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        twenty_sync_status: 'synced',
        twenty_sync_error: null,
      })
    );
  });

  it('marks failed when Twenty API throws', async () => {
    updateOpportunityMock.mockRejectedValueOnce(new Error('crm down'));
    const result = await syncLeadStageToTwenty({
      leadId: 'lead-1',
      tenantSlug: 'peskids',
      adminStatus: 'enrolled',
      twentyOpportunityId: 'opp-1',
    });
    expect(result).toMatchObject({ ok: false, status: 'failed', detail: 'crm down' });
    expect(platformUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        twenty_sync_status: 'failed',
        twenty_sync_error: 'crm down',
      })
    );
  });
});
