import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchPeskidsHotLeadAlert, PESKIDS_N8N_HOT_LEAD_ALERT_PATH } from '../hot-lead-alert';
import type { PeskidsLeadRow } from '../repository';

const sampleLead: PeskidsLeadRow = {
  id: 'lead-hot-1',
  tenant_slug: 'peskids',
  full_name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+573001112233',
  lead_type: 'family',
  service_mode: null,
  class_modality: 'llanogrande',
  neighborhood: 'El Retiro',
  grade_interested: 'K-5',
  child_name: null,
  birth_date: null,
  document_type: null,
  document_number: null,
  company_name: null,
  company_nit: null,
  referral_source: 'instagram',
  status: 'new',
  admin_notes: null,
  metadata: null,
  created_at: '2026-07-22T12:00:00.000Z',
};

describe('dispatchPeskidsHotLeadAlert', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    delete process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED;
    delete process.env.N8N_WEBHOOK_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED;
    delete process.env.N8N_WEBHOOK_BASE_URL;
  });

  it('skips when hot-lead flag is off (default)', async () => {
    const result = await dispatchPeskidsHotLeadAlert(sampleLead);
    expect(result).toMatchObject({
      ok: true,
      status: 'skipped',
      delivery_id: 'hot-lead:lead-hot-1',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts once to n8n when flag is enabled', async () => {
    process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED = 'true';
    process.env.N8N_WEBHOOK_BASE_URL = 'https://n8n-peskids.op-sly.com/webhook';
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{}', { status: 202 }));

    const result = await dispatchPeskidsHotLeadAlert(sampleLead);
    expect(result).toMatchObject({ ok: true, status: 'sent' });
    expect(PESKIDS_N8N_HOT_LEAD_ALERT_PATH).toBe('/peskids-hot-lead-alert');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://n8n-peskids.op-sly.com/webhook/peskids-hot-lead-alert'
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      event_type: 'lead.created',
      lead_id: 'lead-hot-1',
      delivery_id: 'hot-lead:lead-hot-1',
      lead: { parent_name: 'Ana Pérez', email: 'ana@example.com' },
    });
  });

  it('reuses a stable delivery_id so duplicate events do not create a new alert id', async () => {
    process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED = 'true';
    process.env.N8N_WEBHOOK_BASE_URL = 'https://n8n-peskids.op-sly.com/webhook';
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{}', { status: 202 }));

    const first = await dispatchPeskidsHotLeadAlert(sampleLead);
    const second = await dispatchPeskidsHotLeadAlert(sampleLead);
    expect(first.delivery_id).toBe('hot-lead:lead-hot-1');
    expect(second.delivery_id).toBe(first.delivery_id);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(firstBody.event_id).toBe(secondBody.event_id);
    expect(firstBody.lead_id).toBe('lead-hot-1');
  });

  it('returns failed when n8n base URL is missing and flag is on', async () => {
    process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED = 'true';
    const result = await dispatchPeskidsHotLeadAlert(sampleLead);
    expect(result).toMatchObject({
      ok: false,
      status: 'failed',
      detail: 'N8N_WEBHOOK_BASE_URL not configured',
    });
  });
});
