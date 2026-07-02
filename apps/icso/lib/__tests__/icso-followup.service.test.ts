import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IcsoFollowupStore, IcsoStaleDealRecord } from '../icso-followup-store';
import { IcsoFollowupService } from '../icso-followup.service';

function createStaleDeal(): IcsoStaleDealRecord {
  return {
    dealId: 'deal-1',
    accountId: 'account-1',
    contactId: 'contact-1',
    contactEmail: 'lead@example.com',
    contactName: 'Lead User',
    stage: 'prospecting',
    createdAt: new Date().toISOString(),
  };
}

describe('IcsoFollowupService', () => {
  let store: IcsoFollowupStore;
  let evaluateAndAdvance: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = {
      findStaleDeals: vi.fn(async () => [createStaleDeal()]),
      createFollowup: vi.fn(async () => ({ id: 'followup-1' })),
    };
    evaluateAndAdvance = vi.fn(async () => ({
      dealId: 'deal-1',
      previousStage: 'prospecting',
      currentStage: 'qualification',
      advanced: true,
    }));
  });

  it('creates follow-ups for stale deals', async () => {
    const service = new IcsoFollowupService({
      store,
      pipeline: { evaluateAndAdvance } as never,
      staleHoursThreshold: 48,
    });

    const result = await service.runStaleLeadFollowups();

    expect(result.followupsCreated).toBe(1);
    expect(store.createFollowup).toHaveBeenCalledOnce();
    expect(evaluateAndAdvance).toHaveBeenCalledWith('deal-1');
  });
});
