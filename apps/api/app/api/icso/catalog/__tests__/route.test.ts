import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/services/icso-catalog.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/services/icso-catalog.service')>();
  return {
    ...actual,
    readCatalog: vi.fn(),
    saveCatalog: vi.fn(),
  };
});

import { requireAdminAccess } from '../../../../../lib/auth';
import {
  readCatalog,
  saveCatalog,
} from '../../../../../lib/services/icso-catalog.service';
import { GET, PUT } from '../route';

const sampleCatalog = {
  version: '1.0.0',
  updated: '2026-08-01',
  owner: 'icso',
  currency: 'USD',
  disclaimer: 'Disclaimer',
  source_docs: [],
  sales_pitch_es: 'Pitch',
  repeat_commands: {},
  modules: [],
  packages: [],
  verticals: [],
};

describe('/api/icso/catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when admin access is rejected on GET', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await GET(new Request('http://localhost/api/icso/catalog'));

    expect(res.status).toBe(401);
  });

  it('returns 200 with catalog and etag on GET', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(readCatalog).mockReturnValue({ catalog: sampleCatalog, etag: 'abc123' });

    const res = await GET(new Request('http://localhost/api/icso/catalog'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ catalog: sampleCatalog, etag: 'abc123' });
  });

  it('returns 401 when admin access is rejected on PUT', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await PUT(
      new Request('http://localhost/api/icso/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog: {}, etag: 'abc' }),
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 200 on successful PUT', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(saveCatalog).mockReturnValue({ ok: true, etag: 'new-etag' });

    const res = await PUT(
      new Request('http://localhost/api/icso/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: {
            modules: [],
            packages: [],
            verticals: [],
            disclaimer: 'x',
            sales_pitch_es: 'y',
            currency: 'USD',
          },
          etag: 'abc123',
        }),
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, etag: 'new-etag' });
  });

  it('returns 409 stale when etag mismatches', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(saveCatalog).mockReturnValue({ ok: false, reason: 'stale' });

    const res = await PUT(
      new Request('http://localhost/api/icso/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: {
            modules: [],
            packages: [],
            verticals: [],
            disclaimer: 'x',
            sales_pitch_es: 'y',
            currency: 'USD',
          },
          etag: 'stale',
        }),
      })
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: 'Catalog changed since you loaded it; reload and retry.',
      reason: 'stale',
    });
  });

  it('returns 409 referenced when integrity fails', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(saveCatalog).mockReturnValue({
      ok: false,
      reason: 'referenced',
      details: ['package "basic-setup" references unknown module "lead-capture"'],
    });

    const res = await PUT(
      new Request('http://localhost/api/icso/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: {
            modules: [],
            packages: [],
            verticals: [],
            disclaimer: 'x',
            sales_pitch_es: 'y',
            currency: 'USD',
          },
          etag: 'abc123',
        }),
      })
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: 'Cannot save: referential integrity violation.',
      reason: 'referenced',
      details: ['package "basic-setup" references unknown module "lead-capture"'],
    });
  });

  it('returns 400 when request body fails zod validation', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);

    const res = await PUT(
      new Request('http://localhost/api/icso/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: {
            modules: [],
            packages: [],
            verticals: [],
            disclaimer: 'x',
            sales_pitch_es: 'y',
            currency: '',
          },
          etag: 'abc123',
        }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'catalog.currency: String must contain at least 1 character(s)',
    });
    expect(saveCatalog).not.toHaveBeenCalled();
  });

  it('returns 400 when saveCatalog reports invalid payload', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(saveCatalog).mockReturnValue({
      ok: false,
      reason: 'invalid',
      message: 'Failed to read catalog',
    });

    const res = await PUT(
      new Request('http://localhost/api/icso/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: {
            modules: [],
            packages: [],
            verticals: [],
            disclaimer: 'x',
            sales_pitch_es: 'y',
            currency: 'USD',
          },
          etag: 'abc123',
        }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'Failed to read catalog',
    });
  });
});
