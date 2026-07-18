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

  it('unwraps Twenty create operation envelopes', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/rest/people') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ data: { createPerson: { id: 'person-1' } } }),
          { status: 201 }
        );
      }
      if (url.endsWith('/rest/opportunities') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ data: { createOpportunity: { id: 'opp-1' } } }),
          { status: 201 }
        );
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new TwentyClient('secret', 'https://crm.example.com');
    await expect(
      client.createPerson({
        name: { firstName: 'Ana', lastName: 'García' },
        emails: { primaryEmail: 'ana@example.com' },
      })
    ).resolves.toMatchObject({ id: 'person-1' });
    await expect(
      client.createOpportunity({ name: 'Peskids — Ana García' })
    ).resolves.toMatchObject({ id: 'opp-1' });
  });

  it('throws Twenty API messages for validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              statusCode: 400,
              messages: ['Provided phone number is invalid 3000000000'],
            }),
            { status: 400 }
          )
      )
    );

    const client = new TwentyClient('secret', 'https://crm.example.com');
    await expect(
      client.createPerson({
        name: { firstName: 'Ana', lastName: 'García' },
        emails: { primaryEmail: 'ana@example.com' },
      })
    ).rejects.toThrow('Provided phone number is invalid 3000000000');
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

  it('creates a task and links it to a person via taskTarget', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/rest/tasks') && init?.method === 'POST') {
        return new Response(JSON.stringify({ data: { id: 'task-1', status: 'TODO' } }), {
          status: 201,
        });
      }
      if (url.endsWith('/rest/taskTargets') && init?.method === 'POST') {
        return new Response(JSON.stringify({ data: { id: 'target-1' } }), {
          status: 201,
        });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new TwentyClient('secret', 'https://crm.example.com');
    const task = await client.createTask({ title: 'Seguimiento', status: 'TODO' });
    const target = await client.createTaskTarget({
      taskId: task.id,
      personId: 'person-1',
    });

    expect(task.id).toBe('task-1');
    expect(target.id).toBe('target-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('updates a task status', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/rest/tasks/task-1') && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ data: { id: 'task-1', status: 'DONE' } }), {
          status: 200,
        });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new TwentyClient('secret', 'https://crm.example.com');
    const task = await client.updateTask('task-1', { status: 'DONE' });

    expect(task.status).toBe('DONE');
  });

  it('throws when task response lacks id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 201 }))
    );

    const client = new TwentyClient('secret', 'https://crm.example.com');
    await expect(client.createTask({ title: 'Seguimiento' })).rejects.toThrow(
      'Twenty API returned task without id'
    );
  });

  it('finds an existing person by email', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.method ?? 'GET').toBe('GET');
      expect(url).toContain('/rest/people');
      expect(url).toContain(encodeURIComponent('ana@example.com'));
      return new Response(JSON.stringify({ data: { people: [{ id: 'person-1' }] } }), {
        status: 200,
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new TwentyClient('secret', 'https://crm.example.com');
    const person = await client.findPersonByEmail('ana@example.com');

    expect(person?.id).toBe('person-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when no person matches the email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: { people: [] } }), { status: 200 }))
    );

    const client = new TwentyClient('secret', 'https://crm.example.com');
    const person = await client.findPersonByEmail('nobody@example.com');

    expect(person).toBeNull();
  });
});
