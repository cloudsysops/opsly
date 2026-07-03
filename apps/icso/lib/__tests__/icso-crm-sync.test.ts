import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendLeadToTwentyMock = vi.hoisted(() => vi.fn());
const sendLeadToGHLMock = vi.hoisted(() => vi.fn());
const isIntcloudsysopsTwentyConfiguredMock = vi.hoisted(() => vi.fn());
const isIntcloudsysopsGhlEnabledMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/twenty-lead-sync', () => ({
  sendLeadToTwenty: sendLeadToTwentyMock,
}));

vi.mock('@/lib/gohighlevel-lead-sync', () => ({
  sendLeadToGHL: sendLeadToGHLMock,
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isIntcloudsysopsTwentyConfigured: isIntcloudsysopsTwentyConfiguredMock,
  isIntcloudsysopsGhlEnabled: isIntcloudsysopsGhlEnabledMock,
}));

describe('syncLeadToCrm', () => {
  beforeEach(() => {
    sendLeadToTwentyMock.mockReset();
    sendLeadToGHLMock.mockReset();
    isIntcloudsysopsTwentyConfiguredMock.mockReset();
    isIntcloudsysopsGhlEnabledMock.mockReset();
  });

  it('syncs Twenty when configured', async () => {
    isIntcloudsysopsTwentyConfiguredMock.mockReturnValue(true);
    isIntcloudsysopsGhlEnabledMock.mockReturnValue(false);
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
    expect(sendLeadToGHLMock).not.toHaveBeenCalled();
  });

  it('syncs GHL only when legacy flag enabled', async () => {
    isIntcloudsysopsTwentyConfiguredMock.mockReturnValue(false);
    isIntcloudsysopsGhlEnabledMock.mockReturnValue(true);
    sendLeadToGHLMock.mockResolvedValue({ ghlContactId: 'ghl-99' });

    const { syncLeadToCrm } = await import('../icso-crm-sync');
    const result = await syncLeadToCrm({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello',
    });

    expect(result).toEqual({ ghlContactId: 'ghl-99' });
    expect(sendLeadToTwentyMock).not.toHaveBeenCalled();
  });
});
