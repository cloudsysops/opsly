import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitPeskidsLeadBoardEvent } from '../board-signal';
import type { PeskidsLeadRow } from '../repository';

const lead: PeskidsLeadRow = {
  id: 'lead-99',
  tenant_slug: 'peskids',
  full_name: 'Maria Rodriguez',
  email: 'maria@example.com',
  phone: '+573001112233',
  lead_type: 'family',
  service_mode: null,
  class_modality: 'llanogrande',
  neighborhood: 'El Porvenir',
  grade_interested: 'K-5',
  child_name: null,
  birth_date: null,
  document_type: null,
  document_number: null,
  company_name: null,
  company_nit: null,
  referral_source: null,
  status: 'new',
  admin_notes: null,
  metadata: null,
  created_at: '2026-09-07T15:00:00.000Z',
};

describe('emitPeskidsLeadBoardEvent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPSLY_EVENT_BUS_URL;
    delete process.env.OPSLY_ORCHESTRATOR_URL;
    delete process.env.OPSLY_EVENT_BUS_TOKEN;
  });

  it('posts IDs only and never includes PII', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);
    process.env.OPSLY_EVENT_BUS_URL = 'http://orchestrator:3011/events';

    await emitPeskidsLeadBoardEvent(lead);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as {
      event_type: string;
      data: Record<string, unknown>;
    };
    expect(payload.event_type).toBe('lead.created');
    expect(payload.data).toEqual({
      lead_id: 'lead-99',
      hot: true,
      has_phone: true,
    });
    expect(JSON.stringify(payload)).not.toMatch(/maria@example.com|\+573001112233|Maria/);
  });

  it('swallows bus failures so intake is not blocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('orchestrator down')));
    process.env.OPSLY_ORCHESTRATOR_URL = 'http://orchestrator:3011';
    await expect(emitPeskidsLeadBoardEvent(lead)).resolves.toBeUndefined();
  });

  it('no-ops when the event bus is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await emitPeskidsLeadBoardEvent(lead);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
