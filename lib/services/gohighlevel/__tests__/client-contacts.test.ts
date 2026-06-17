import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoHighLevelClient } from '../client.js';

const LOCATION_ID = 'loc-test-123';
const API_KEY = 'pit-test-key';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GoHighLevelClient contact writes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createContact serializes customFields as array for LeadConnector', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ contact: { id: 'contact-1', name: 'Parent Test' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GoHighLevelClient(API_KEY, 'https://services.leadconnectorhq.com', {
      locationId: LOCATION_ID,
    });

    await client.createContact({
      name: 'Parent Test',
      email: 'parent@example.com',
      source: 'web',
      customFields: {
        child_name: 'Mateo',
        grade_interested: '5-7',
      },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      customFields: Array<{ key: string; field_value: string }>;
      locationId: string;
    };

    expect(body.locationId).toBe(LOCATION_ID);
    expect(Array.isArray(body.customFields)).toBe(true);
    expect(body.customFields).toEqual([
      { key: 'child_name', field_value: 'Mateo' },
      { key: 'grade_interested', field_value: '5-7' },
    ]);
  });

  it('createContact omits customFields when map is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ contact: { id: 'contact-2', name: 'Health Monitor' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GoHighLevelClient(API_KEY, 'https://services.leadconnectorhq.com', {
      locationId: LOCATION_ID,
    });

    await client.createContact({
      email: 'monitor@example.com',
      name: 'Health Monitor',
      source: 'health-check',
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.customFields).toBeUndefined();
  });

  it('updateContact serializes customFields as array for LeadConnector', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ contact: { id: 'contact-3', name: 'Referrer' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GoHighLevelClient(API_KEY, 'https://services.leadconnectorhq.com', {
      locationId: LOCATION_ID,
    });

    await client.updateContact('contact-3', {
      customFields: { referral_code: 'PK-ABC123' },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      customFields: Array<{ key: string; field_value: string }>;
    };

    expect(body.customFields).toEqual([{ key: 'referral_code', field_value: 'PK-ABC123' }]);
  });
});
