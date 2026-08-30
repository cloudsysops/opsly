import { beforeEach, describe, expect, it, vi } from 'vitest';

const isIntcloudsysopsTwentyConfiguredMock = vi.hoisted(() => vi.fn());
const sendLeadToTwentyMock = vi.hoisted(() => vi.fn());

vi.mock('@intcloudsysops/services/twenty', () => ({
  isIntcloudsysopsTwentyConfigured: isIntcloudsysopsTwentyConfiguredMock,
}));

vi.mock('@/lib/twenty-lead-sync', () => ({
  sendLeadToTwenty: sendLeadToTwentyMock,
}));

import { syncLeadToCrm } from '@/lib/icso-crm-sync';

describe('syncLeadToCrm', () => {
  beforeEach(() => {
    isIntcloudsysopsTwentyConfiguredMock.mockReset();
    sendLeadToTwentyMock.mockReset();
    isIntcloudsysopsTwentyConfiguredMock.mockReturnValue(true);
  });

  it('syncs to Twenty when configured', async () => {
    sendLeadToTwentyMock.mockResolvedValue({
      twentyPersonId: 'p-1',
      twentyOpportunityId: 'o-1',
    });

    const result = await syncLeadToCrm({
      name: 'Carlos',
      email: 'carlos@example.com',
      message: 'Interested in Opsly',
    });

    expect(sendLeadToTwentyMock).toHaveBeenCalledOnce();
    expect(result.twentyPersonId).toBe('p-1');
  });

  it('returns empty when Twenty is not configured', async () => {
    isIntcloudsysopsTwentyConfiguredMock.mockReturnValue(false);

    const result = await syncLeadToCrm({
      name: 'Carlos',
      email: 'carlos@example.com',
      message: 'Interested in Opsly',
    });

    expect(sendLeadToTwentyMock).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
