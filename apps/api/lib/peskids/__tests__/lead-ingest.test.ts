import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceClientMock = vi.fn();

vi.mock('../../supabase', () => ({
  getServiceClient: getServiceClientMock,
}));

function createLeadQuery(result: { data: unknown; error: unknown }) {
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

describe('lead-ingest', () => {
  beforeEach(() => {
    getServiceClientMock.mockReset();
  });

  it('inserts a new lead record when none exists', async () => {
    const existingQuery = createLeadQuery({ data: null, error: null });
    const insertedQuery = createLeadQuery({
      data: {
        id: 'row-1',
        tenant_slug: 'peskids',
        lead_id: 'lead-1',
        source: 'gohighlevel',
        stage: 'New Lead',
        created_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    const fromQuery = {
      select: existingQuery.select,
      eq: existingQuery.eq,
      order: existingQuery.order,
      maybeSingle: existingQuery.maybeSingle,
      update: vi.fn(() => insertedQuery),
      insert: vi.fn(() => insertedQuery),
    };

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fromQuery),
      })),
    });

    const { persistPeskidsLead } = await import('../lead-ingest');
    const result = await persistPeskidsLead({
      tenantSlug: 'peskids',
      leadId: 'lead-1',
      source: 'gohighlevel',
      stage: 'New Lead',
      createdAt: '2026-06-01T10:00:00.000Z',
      parentName: 'Maria Rodriguez',
      phone: '+573001112233',
      email: 'maria@example.com',
      childName: 'Mateo',
      age: 8,
      interest: 'Trial class',
      eventId: 'evt-1',
      automationReady: true,
    });

    expect(result).toEqual({
      ok: true,
      created: true,
      row: expect.objectContaining({ lead_id: 'lead-1', source: 'gohighlevel', stage: 'New Lead' }),
    });
    expect(existingQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(fromQuery.insert).toHaveBeenCalledTimes(1);
    expect(fromQuery.update).not.toHaveBeenCalled();
    expect(insertedQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('id, tenant_slug, lead_id, source, stage, created_at, updated_at')
    );
    expect(insertedQuery.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('updates an existing lead record idempotently', async () => {
    const existingQuery = createLeadQuery({
      data: {
        id: 'row-1',
        tenant_slug: 'peskids',
        lead_id: 'lead-1',
        source: 'gohighlevel',
        stage: 'New Lead',
        created_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    const updatedQuery = createLeadQuery({
      data: {
        id: 'row-1',
        tenant_slug: 'peskids',
        lead_id: 'lead-1',
        source: 'gohighlevel',
        stage: 'Contacted',
        created_at: '2026-06-01T10:00:00.000Z',
      },
      error: null,
    });
    const fromQuery = {
      select: existingQuery.select,
      eq: existingQuery.eq,
      order: existingQuery.order,
      maybeSingle: existingQuery.maybeSingle,
      update: vi.fn(() => updatedQuery),
      insert: vi.fn(() => updatedQuery),
    };

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => fromQuery),
      })),
    });

    const { persistPeskidsLead } = await import('../lead-ingest');
    const result = await persistPeskidsLead({
      tenantSlug: 'peskids',
      leadId: 'lead-1',
      source: 'gohighlevel',
      stage: 'Contacted',
      createdAt: '2026-06-01T11:00:00.000Z',
      parentName: 'Maria Rodriguez',
      phone: '+573001112233',
      email: 'maria@example.com',
      childName: 'Mateo',
      age: 8,
      interest: 'Trial class',
      eventId: 'evt-2',
      automationReady: true,
    });

    expect(result).toEqual({
      ok: true,
      created: false,
      row: expect.objectContaining({ lead_id: 'lead-1', stage: 'Contacted' }),
    });
    expect(existingQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(fromQuery.update).toHaveBeenCalledTimes(1);
    expect(fromQuery.insert).not.toHaveBeenCalled();
    expect(updatedQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('id, tenant_slug, lead_id, source, stage, created_at, updated_at')
    );
    expect(updatedQuery.eq).toHaveBeenCalledWith('id', 'row-1');
    expect(updatedQuery.maybeSingle).toHaveBeenCalledTimes(1);
  });
});
