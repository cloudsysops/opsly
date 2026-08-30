import { describe, expect, it } from 'vitest';
import { POST } from '../route';

async function play(save: unknown, action: unknown) {
  const request = {
    json: async () => ({ save, action }),
  } as Request;
  const response = await POST(request);
  const data = (await response.json()) as {
    error?: string;
    save?: { screen: string; runtime?: { events?: Array<{ type: string }> } };
    view?: {
      nova: { name: string };
      traveler: { name: string };
      worldName: string;
      inventory: Array<{ family: string }>;
      retryMessage: string | null;
    };
  };
  return { status: response.status, data };
}

describe('POST /api/universe/play', () => {
  it('runs First Portal through Game Core and awards fragments', async () => {
    let save: unknown = null;
    const begin = await play(save, { type: 'begin' });
    expect(begin.status).toBe(200);
    save = begin.data.save;
    const created = await play(save, {
      type: 'create-explorer',
      explorer: {
        displayName: 'Explorer NovaBlue',
        palette: 'gold-navy',
        avatarVariant: 'ring',
      },
    });
    expect(created.data.view?.nova.name).toBe('NØVA');
    expect(created.data.view?.traveler.name).toBe('THE TRAVELER');
    expect(created.data.view?.worldName).toBe('NEXUS');
    save = created.data.save;
    save = (await play(save, { type: 'advance-dialogue' })).data.save;
    while ((save as { screen: string }).screen === 'dialogue') {
      save = (await play(save, { type: 'advance-dialogue' })).data.save;
    }
    const portal = await play(save, { type: 'enter-first-portal' });
    save = portal.data.save;
    const wrong = await play(save, { type: 'connect', from: 'node-output', to: 'node-input' });
    expect(wrong.data.view?.retryMessage).toMatch(/Not yet/);
    expect(wrong.data.save?.runtime?.events?.some((event) => event.type === 'mission.retried')).toBe(
      true,
    );
    save = wrong.data.save;
    save = (await play(save, { type: 'connect', from: 'node-input', to: 'node-process' })).data.save;
    const done = await play(save, { type: 'connect', from: 'node-process', to: 'node-output' });
    expect(done.data.save?.screen).toBe('complete');
    const families = done.data.view?.inventory.map((item) => item.family) ?? [];
    expect(families).toContain('knowledge-fragment');
    expect(families).toContain('map-fragment');
  });

  it('rejects explorer payloads with PII fields', async () => {
    const begin = await play(null, { type: 'begin' });
    const blocked = await play(begin.data.save, {
      type: 'create-explorer',
      explorer: {
        displayName: 'Explorer NovaBlue',
        palette: 'gold-navy',
        avatarVariant: 'ring',
        email: 'kid@school.test',
      },
    });
    expect(blocked.status).toBe(400);
    expect(blocked.data.error).toMatch(/email|unrecognized/i);
  });
});
