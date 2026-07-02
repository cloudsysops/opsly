import { afterEach, describe, expect, it, vi } from 'vitest';
import { TwentyClient } from '../client.js';

describe('TwentyClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a person and opportunity', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/rest/people') && init?.method === 'POST') {
        return new Response(JSON.stringify({ data: { id: 'person-1' } }), {
          status: 201,
        });
      }
      if (url.endsWith('/rest/opportunities') && init?.method === 'POST') {
        return new Response(JSON.stringify({ data: { id: 'opp-1', stage: 'NEW' } }), {
          status: 201,
        });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new TwentyClient('secret', 'https://crm.example.com');
    const person = await client.createPerson({
      name: { firstName: 'Ana', lastName: 'García' },
      emails: { primaryEmail: 'ana@example.com' },
    });
    const opportunity = await client.createOpportunity({
      name: 'Peskids — Ana García',
      stage: 'NEW',
      pointOfContact: { connect: { id: person.id } },
    });

    expect(person.id).toBe('person-1');
    expect(opportunity.id).toBe('opp-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when person response lacks id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 201 }))
    );

    const client = new TwentyClient('secret', 'https://crm.example.com');
    await expect(
      client.createPerson({
        name: { firstName: 'Ana', lastName: 'García' },
        emails: { primaryEmail: 'ana@example.com' },
      })
    ).rejects.toThrow('Twenty API returned person without id');
  });
});
