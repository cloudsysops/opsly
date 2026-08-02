import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCommercialCatalog } from '@/lib/fetch-commercial-catalog';
import type { CommercialCatalog } from '@/lib/commercial-catalog';

const sampleCatalog = {
  version: '1.0.0',
  updated: '2026-08-01',
  owner: 'icso',
  currency: 'USD',
  disclaimer: 'test',
  sales_pitch_es: 'pitch',
  modules: [],
  packages: [],
  verticals: [],
} satisfies CommercialCatalog;

describe('fetchCommercialCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.OPSLY_API_URL;
  });

  it('fetches public catalog with cache no-store', async () => {
    process.env.OPSLY_API_URL = 'http://api.test:3000';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ catalog: sampleCatalog }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const catalog = await fetchCommercialCatalog();
    expect(catalog).toEqual(sampleCatalog);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test:3000/api/icso/catalog/public', {
      cache: 'no-store',
    });
  });

  it('throws on non-200 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCommercialCatalog()).rejects.toThrow(/No se pudo cargar el catálogo/);
  });
});
