import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCIConclusion } from '../workers/ValidationWorker.js';

describe('fetchCIConclusion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns failure for auth/permission/not-found API responses', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    fetchSpy.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    await expect(fetchCIConclusion('sha', 'token')).resolves.toBe('failure');

    fetchSpy.mockResolvedValueOnce(new Response('forbidden', { status: 403 }));
    await expect(fetchCIConclusion('sha', 'token')).resolves.toBe('failure');

    fetchSpy.mockResolvedValueOnce(new Response('not-found', { status: 404 }));
    await expect(fetchCIConclusion('sha', 'token')).resolves.toBe('failure');
  });

  it('keeps transient API errors as pending', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('server-error', { status: 500 }));
    await expect(fetchCIConclusion('sha', 'token')).resolves.toBe('pending');
  });
});
