import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
  };
});

import { readFile } from 'node:fs/promises';
import { requireAdminAccess } from '../../../../../lib/auth';

describe('GET /api/agents/team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const req = new Request('http://localhost/api/agents/team') as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns team config when configuration file exists', async () => {
    const req = new Request('http://localhost/api/agents/team') as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { team: { name: string }; generated_at: string };
    expect(body).toHaveProperty('team');
    expect(body).toHaveProperty('generated_at');
  });

  it('returns generic sanitized 500 error on loading failure without leaking internal paths', async () => {
    vi.mocked(readFile).mockRejectedValue(
      new Error('ENOENT: no such file or directory, open /secret/internal/path/config.json')
    );
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new Request('http://localhost/api/agents/team') as unknown as NextRequest;
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unable to load agents team config');
    expect(body.error).not.toContain('/secret/internal/path');

    consoleErrorSpy.mockRestore();
  });
});
