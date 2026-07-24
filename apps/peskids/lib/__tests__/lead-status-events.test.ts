import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  emitLeadStatusTransition,
} from '@/lib/events';

describe('emitLeadStatusTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPSLY_EVENT_BUS_URL;
  });

  it('posts status_changed and contacted', async () => {
    process.env.OPSLY_EVENT_BUS_URL = 'https://example.invalid/events';
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await emitLeadStatusTransition({
      leadId: 'lead-1',
      fromStatus: 'new',
      toStatus: 'contacted',
    });

    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(bodies.map((b: { event_type: string }) => b.event_type)).toEqual([
      'lead.status_changed',
      'lead.contacted',
    ]);
  });

  it('posts lead.lost when archived', async () => {
    process.env.OPSLY_EVENT_BUS_URL = 'https://example.invalid/events';
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await emitLeadStatusTransition({
      leadId: 'lead-2',
      fromStatus: 'contacted',
      toStatus: 'archived',
    });

    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(bodies.map((b: { event_type: string }) => b.event_type)).toContain('lead.lost');
  });

  it('no-ops when status unchanged', async () => {
    process.env.OPSLY_EVENT_BUS_URL = 'https://example.invalid/events';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await emitLeadStatusTransition({
      leadId: 'lead-3',
      fromStatus: 'new',
      toStatus: 'new',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
