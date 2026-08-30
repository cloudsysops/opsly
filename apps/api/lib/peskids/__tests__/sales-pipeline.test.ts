import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingleMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })) })) }));
const updateMock = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
  })),
}));
const fromMock = vi.fn(() => ({
  select: selectMock,
  update: updateMock,
}));
const schemaMock = vi.fn(() => ({ from: fromMock }));

vi.mock('../../supabase', () => ({
  getServiceClient: () => ({ schema: schemaMock }),
}));

vi.mock('../../logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { updateLeadStage } from '../sales-pipeline';

describe('updateLeadStage', () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    fromMock.mockClear();
  });

  it('returns NOT_FOUND when lead missing', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const result = await updateLeadStage('peskids', 'lead-1', 'Contacted');
    expect(result).toEqual({ ok: false, error: 'lead not found', code: 'NOT_FOUND' });
  });

  it('returns NO_CHANGE when stage unchanged', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: '1', tenant_slug: 'peskids', lead_id: 'lead-1', source: 'web', stage: 'Contacted' },
      error: null,
    });
    const result = await updateLeadStage('peskids', 'lead-1', 'Contacted');
    expect(result).toEqual({ ok: false, error: 'stage unchanged', code: 'NO_CHANGE' });
  });
});
