import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoHighLevelClient } from '../client.js';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('GoHighLevelClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('uses POST /contacts/search for contact search and aliases getContacts to it', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        contacts: [{ id: 'c1', name: 'Parent One' }],
        count: 1,
      })
    );

    const client = new GoHighLevelClient('api-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-123',
    });

    const result = await client.getContacts({ search: 'Parent', limit: 10, offset: 0 });

    expect(result.data).toEqual([{ id: 'c1', name: 'Parent One' }]);
    expect(result.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://services.leadconnectorhq.com/contacts/search');
    expect(init).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer api-key',
        Version: '2021-07-28',
      }),
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      query: 'Parent',
      limit: 10,
      offset: 0,
    });
  });

  it('derives a location access token from an agency token when CRM calls return 401', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({
          location: { companyId: 'company-1' },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'location-token-1',
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          contacts: [{ id: 'c1', name: 'Parent One' }],
          count: 1,
        })
      );

    const client = new GoHighLevelClient('agency-token', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-123',
    });

    const result = await client.searchContacts({ query: 'Parent' });

    expect(result.data).toEqual([{ id: 'c1', name: 'Parent One' }]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://services.leadconnectorhq.com/contacts/search');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer agency-token',
      }),
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://services.leadconnectorhq.com/locations/loc-123');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://services.leadconnectorhq.com/oauth/locationToken');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer agency-token',
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
    });
    expect(String(fetchMock.mock.calls[2]?.[1]?.body)).toContain('companyId=company-1');
    expect(String(fetchMock.mock.calls[2]?.[1]?.body)).toContain('locationId=loc-123');
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer location-token-1',
      }),
    });
  });

  it('creates, updates and deletes tags at the location scope', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ tag: { id: 'tag-1', name: 'academy_lead' } }))
      .mockResolvedValueOnce(jsonResponse({ tag: { id: 'tag-1', name: 'academy_parent' } }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    const client = new GoHighLevelClient('api-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-123',
    });

    await expect(client.createTag({ name: 'academy_lead' })).resolves.toEqual({
      id: 'tag-1',
      name: 'academy_lead',
    });
    await expect(client.updateTag('tag-1', { name: 'academy_parent' })).resolves.toEqual({
      id: 'tag-1',
      name: 'academy_parent',
    });
    await expect(client.deleteTag('tag-1')).resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://services.leadconnectorhq.com/locations/loc-123/tags'
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://services.leadconnectorhq.com/locations/loc-123/tags/tag-1'
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT' });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('lists and creates custom fields with the location scope', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          customFields: [{ id: 'field-1', name: 'Student Name', model: 'contact' }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          customField: { id: 'field-2', name: 'Program Interest', model: 'contact' },
        })
      );

    const client = new GoHighLevelClient('api-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-123',
    });

    await expect(client.listCustomFields('contact')).resolves.toEqual([
      { id: 'field-1', name: 'Student Name', model: 'contact' },
    ]);
    await expect(
      client.createCustomField({
        name: 'Program Interest',
        dataType: 'TEXT',
        model: 'contact',
      })
    ).resolves.toEqual({ id: 'field-2', name: 'Program Interest', model: 'contact' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://services.leadconnectorhq.com/locations/loc-123/customFields?model=contact'
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://services.leadconnectorhq.com/locations/loc-123/customFields'
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      name: 'Program Interest',
      dataType: 'TEXT',
      model: 'contact',
    });
  });

  it('creates, searches, updates and deletes opportunities', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ opportunity: { id: 'opp-1', name: 'Trial Lead', status: 'open' } })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          opportunities: [{ id: 'opp-1', name: 'Trial Lead', status: 'open' }],
          total: 1,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ opportunity: { id: 'opp-1', name: 'Trial Lead Updated', status: 'open' } })
      )
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    const client = new GoHighLevelClient('api-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-123',
    });

    await expect(
      client.createOpportunity({
        pipelineId: 'pipe-1',
        name: 'Trial Lead',
        status: 'open',
        contactId: 'contact-1',
      })
    ).resolves.toEqual({ id: 'opp-1', name: 'Trial Lead', status: 'open' });
    await expect(client.searchOpportunities({ query: 'Trial' })).resolves.toEqual({
      data: [{ id: 'opp-1', name: 'Trial Lead', status: 'open' }],
      total: 1,
      limit: undefined,
      offset: undefined,
    });
    await expect(client.updateOpportunity('opp-1', { name: 'Trial Lead Updated' })).resolves.toEqual(
      { id: 'opp-1', name: 'Trial Lead Updated', status: 'open' }
    );
    await expect(client.deleteOpportunity('opp-1')).resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://services.leadconnectorhq.com/opportunities/');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      locationId: 'loc-123',
      pipelineId: 'pipe-1',
      name: 'Trial Lead',
      status: 'open',
      contactId: 'contact-1',
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://services.leadconnectorhq.com/opportunities/search');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      locationId: 'loc-123',
      query: 'Trial',
    });
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://services.leadconnectorhq.com/opportunities/opp-1');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PUT' });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('lists and creates calendars with the location scope', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ calendars: [{ id: 'cal-1', name: 'Main Calendar' }] }))
      .mockResolvedValueOnce(jsonResponse({ calendar: { id: 'cal-2', name: 'Trial Calendar' } }));

    const client = new GoHighLevelClient('api-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-123',
    });

    await expect(client.getCalendars({ groupId: 'group-1', showDrafted: false })).resolves.toEqual([
      { id: 'cal-1', name: 'Main Calendar' },
    ]);
    await expect(
      client.createCalendar({
        name: 'Trial Calendar',
        isActive: true,
      })
    ).resolves.toEqual({ id: 'cal-2', name: 'Trial Calendar' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://services.leadconnectorhq.com/calendars/?locationId=loc-123&groupId=group-1&showDrafted=false'
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://services.leadconnectorhq.com/calendars/');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      locationId: 'loc-123',
      name: 'Trial Calendar',
      isActive: true,
    });
  });
});
