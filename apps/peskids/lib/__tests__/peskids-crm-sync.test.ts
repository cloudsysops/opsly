import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendLeadToTwentyMock = vi.fn();
const sendLeadToGHLMock = vi.fn();
const isTwentyConfiguredMock = vi.fn();
const isPeskidsGhlEnabledMock = vi.fn();

vi.mock('@/lib/twenty-lead-sync', () => ({
  sendLeadToTwenty: sendLeadToTwentyMock,
}));

vi.mock('@/lib/gohighlevel-lead-sync', () => ({
  sendLeadToGHL: sendLeadToGHLMock,
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isTwentyConfigured: isTwentyConfiguredMock,
  isPeskidsGhlEnabled: isPeskidsGhlEnabledMock,
}));

describe('syncLeadToCrm', () => {
  beforeEach(() => {
    sendLeadToTwentyMock.mockReset();
    sendLeadToGHLMock.mockReset();
    isTwentyConfiguredMock.mockReturnValue(false);
    isPeskidsGhlEnabledMock.mockReturnValue(false);
  });

  it('syncs to Twenty when configured', async () => {
    isTwentyConfiguredMock.mockReturnValue(true);
    sendLeadToTwentyMock.mockResolvedValue({
      twentyPersonId: 'person-1',
      twentyOpportunityId: 'opp-1',
    });

    const { syncLeadToCrm } = await import('../peskids-crm-sync');
    const result = await syncLeadToCrm({
      parentName: 'Ana García',
      email: 'ana@example.com',
      gradeInterested: 'K-5',
    });

    expect(result).toEqual({
      twentyPersonId: 'person-1',
      twentyOpportunityId: 'opp-1',
    });
    expect(sendLeadToGHLMock).not.toHaveBeenCalled();
  });

  it('syncs to GHL only when explicitly enabled', async () => {
    isPeskidsGhlEnabledMock.mockReturnValue(true);
    sendLeadToGHLMock.mockResolvedValue({ ghlContactId: 'ghl-99' });

    const { syncLeadToCrm } = await import('../peskids-crm-sync');
    const result = await syncLeadToCrm({
      parentName: 'Ana García',
      email: 'ana@example.com',
    });

    expect(result).toEqual({ ghlContactId: 'ghl-99' });
    expect(sendLeadToTwentyMock).not.toHaveBeenCalled();
  });
});
