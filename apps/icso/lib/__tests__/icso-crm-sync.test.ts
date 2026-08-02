import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendLeadToTwentyMock = vi.hoisted(() => vi.fn());
const isIntcloudsysopsTwentyConfiguredMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/twenty-lead-sync', () => ({
  sendLeadToTwenty: sendLeadToTwentyMock,
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isIntcloudsysopsTwentyConfigured: isIntcloudsysopsTwentyConfiguredMock,
}));

describe('syncLeadToCrm', () => {
  beforeEach(() => {
    sendLeadToTwentyMock.mockReset();
    isIntcloudsysopsTwentyConfiguredMock.mockReset();
  });

  it('syncs Twenty when configured', async () => {
    isIntcloudsysopsTwentyConfiguredMock.mockReturnValue(true);
    sendLeadToTwentyMock.mockResolvedValue({
      twentyPersonId: 'person-1',
      twentyOpportunityId: 'opp-1',
    });

    const { syncLeadToCrm } = await import('../icso-crm-sync');
    const result = await syncLeadToCrm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Need automation',
    });

    expect(result).toEqual({
      twentyPersonId: 'person-1',
      twentyOpportunityId: 'opp-1',
    });
    expect(sendLeadToTwentyMock).toHaveBeenCalledOnce();
  });

  it('returns empty when Twenty is not configured', async () => {
    isIntcloudsysopsTwentyConfiguredMock.mockReturnValue(false);

    const { syncLeadToCrm } = await import('../icso-crm-sync');
    const result = await syncLeadToCrm({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello',
    });

    expect(result).toEqual({});
    expect(sendLeadToTwentyMock).not.toHaveBeenCalled();
  });
});
