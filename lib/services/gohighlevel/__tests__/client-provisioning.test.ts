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

describe('GoHighLevelClient provisioning API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listTags calls location tags endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ tags: [{ id: 'tag-1', name: 'lead-web' }] })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GoHighLevelClient(API_KEY, 'https://services.leadconnectorhq.com', {
      locationId: LOCATION_ID,
    });

    const tags = await client.listTags();
    expect(tags).toHaveLength(1);
    expect(tags[0]?.name).toBe('lead-web');
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/locations/${LOCATION_ID}/tags`);
  });

  it('createCalendar uses calendar API version header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ calendar: { id: 'cal-1', name: 'Trial Class', slug: 'trial-class' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GoHighLevelClient(API_KEY, 'https://services.leadconnectorhq.com', {
      locationId: LOCATION_ID,
    });

    const calendar = await client.createCalendar({
      name: 'Trial Class',
      slug: 'trial-class',
      slotDuration: 30,
    });

    expect(calendar.id).toBe('cal-1');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Version).toBe('2021-04-15');
  });

  it('createEventCalendarSchedule posts rules payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ schedule: { id: 'sched-1' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GoHighLevelClient(API_KEY, 'https://services.leadconnectorhq.com', {
      locationId: LOCATION_ID,
    });

    await client.createEventCalendarSchedule('cal-1', {
      timezone: 'America/Bogota',
      rules: [
        {
          type: 'wday',
          day: 'monday',
          intervals: [{ from: '16:00', to: '20:00' }],
        },
      ],
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { timezone: string };
    expect(body.timezone).toBe('America/Bogota');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/calendars/schedules/event-calendar/cal-1');
  });
});
