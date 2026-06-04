import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceClientMock = vi.fn();
const updateOpportunityStageMock = vi.fn();
const getGoHighLevelServiceMock = vi.fn(() => ({
  updateOpportunityStage: updateOpportunityStageMock,
}));

vi.mock('../../supabase', () => ({
  getServiceClient: getServiceClientMock,
}));

vi.mock('@intcloudsysops/services/gohighlevel', () => ({
  getGoHighLevelService: getGoHighLevelServiceMock,
}));

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
  };
  return query;
}

describe('updateLeadStage', () => {
  beforeEach(() => {
    getServiceClientMock.mockReset();
    updateOpportunityStageMock.mockReset();
  });

  it('returns NOT_FOUND when lead does not exist', async () => {
    const fetchQuery = createQuery({ data: null, error: null });
    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fetchQuery),
      })),
    });

    const { updateLeadStage } = await import('../sales-pipeline');
    const result = await updateLeadStage('peskids', 'nonexistent-id', 'Contacted');

    expect(result).toEqual({ ok: false, error: 'lead not found', code: 'NOT_FOUND' });
    expect(fetchQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(updateOpportunityStageMock).not.toHaveBeenCalled();
  });

  it('returns NO_CHANGE when stage is the same', async () => {
    const fetchQuery = createQuery({
      data: {
        id: 'lead-1',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-1',
        source: 'gohighlevel',
        stage: 'Contacted',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fetchQuery),
      })),
    });

    const { updateLeadStage } = await import('../sales-pipeline');
    const result = await updateLeadStage('peskids', 'lead-1', 'Contacted');

    expect(result).toEqual({ ok: false, error: 'stage unchanged', code: 'NO_CHANGE' });
    expect(updateOpportunityStageMock).not.toHaveBeenCalled();
  });

  it('updates stage and syncs to GHL when lead has ghl lead_id', async () => {
    const fetchQuery = createQuery({
      data: {
        id: 'lead-1',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-1',
        source: 'gohighlevel',
        stage: 'New Lead',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    const updateQuery = createQuery({
      data: {
        id: 'lead-1',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-1',
        source: 'gohighlevel',
        stage: 'Contacted',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-02T10:00:00.000Z',
      },
      error: null,
    });
    const fromQuery = {
      select: fetchQuery.select,
      eq: fetchQuery.eq,
      order: fetchQuery.order,
      maybeSingle: fetchQuery.maybeSingle,
      update: vi.fn(() => updateQuery),
      insert: vi.fn(() => updateQuery),
    };

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fromQuery),
      })),
    });

    updateOpportunityStageMock.mockResolvedValue({ success: true });

    const { updateLeadStage } = await import('../sales-pipeline');
    const result = await updateLeadStage('peskids', 'lead-1', 'Contacted');

    expect(result).toEqual({
      ok: true,
      lead: expect.objectContaining({ id: 'lead-1', stage: 'Contacted' }),
    });

    expect(fetchQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(fromQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'Contacted' })
    );
    expect(fromQuery.update).toHaveBeenCalledTimes(1);
    expect(updateOpportunityStageMock).toHaveBeenCalledWith('peskids', 'ghl-lead-1', '2');
  });

  it('updates stage locally but allows GHL to fail gracefully', async () => {
    const fetchQuery = createQuery({
      data: {
        id: 'lead-1',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-1',
        source: 'gohighlevel',
        stage: 'Contacted',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    const updateQuery = createQuery({
      data: {
        id: 'lead-1',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-1',
        source: 'gohighlevel',
        stage: 'Enrolled',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-02T10:00:00.000Z',
      },
      error: null,
    });
    const fromQuery = {
      select: fetchQuery.select,
      eq: fetchQuery.eq,
      order: fetchQuery.order,
      maybeSingle: fetchQuery.maybeSingle,
      update: vi.fn(() => updateQuery),
      insert: vi.fn(() => updateQuery),
    };

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fromQuery),
      })),
    });

    updateOpportunityStageMock.mockRejectedValue(new Error('GHL API timeout'));

    const { updateLeadStage } = await import('../sales-pipeline');
    const result = await updateLeadStage('peskids', 'lead-1', 'Enrolled');

    expect(result.ok).toBe(true);
    expect(result.code).toBe('GHL_FAILED');
    if ('lead' in result) {
      expect(result.lead).toBeDefined();
    }
    expect(updateOpportunityStageMock).toHaveBeenCalled();
  });

  it('skips GHL sync when stage has no mapping (Active Student)', async () => {
    const fetchQuery = createQuery({
      data: {
        id: 'lead-2',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-2',
        source: 'gohighlevel',
        stage: 'Enrolled',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    const updateQuery = createQuery({
      data: {
        id: 'lead-2',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-2',
        source: 'gohighlevel',
        stage: 'Active Student',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-02T10:00:00.000Z',
      },
      error: null,
    });
    const fromQuery = {
      select: fetchQuery.select,
      eq: fetchQuery.eq,
      order: fetchQuery.order,
      maybeSingle: fetchQuery.maybeSingle,
      update: vi.fn(() => updateQuery),
      insert: vi.fn(() => updateQuery),
    };

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fromQuery),
      })),
    });

    const { updateLeadStage } = await import('../sales-pipeline');
    const result = await updateLeadStage('peskids', 'lead-2', 'Active Student');

    expect(result).toEqual({
      ok: true,
      lead: expect.objectContaining({ id: 'lead-2', stage: 'Active Student' }),
    });
    expect(updateOpportunityStageMock).not.toHaveBeenCalled();
  });

  it('returns error when database update fails', async () => {
    const fetchQuery = createQuery({
      data: {
        id: 'lead-1',
        tenant_slug: 'peskids',
        lead_id: 'ghl-lead-1',
        source: 'gohighlevel',
        stage: 'New Lead',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    const updateQuery = createQuery({
      data: null,
      error: { message: 'update failed' },
    });
    const fromQuery = {
      select: fetchQuery.select,
      eq: fetchQuery.eq,
      order: fetchQuery.order,
      maybeSingle: fetchQuery.maybeSingle,
      update: vi.fn(() => updateQuery),
      insert: vi.fn(() => updateQuery),
    };

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fromQuery),
      })),
    });

    const { updateLeadStage } = await import('../sales-pipeline');
    const result = await updateLeadStage('peskids', 'lead-1', 'Contacted');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('update failed');
    expect(updateOpportunityStageMock).not.toHaveBeenCalled();
  });
});
