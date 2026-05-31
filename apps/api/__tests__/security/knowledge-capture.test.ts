import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../../app/api/knowledge/capture/route';
import { join } from 'node:path';

// Mocking fs/promises to avoid writing to real files during tests
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('# Mock content'),
  };
});

// Also mock existsSync
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
  };
});

// Mock resolveSuperAdminSession to avoid real Supabase calls
vi.mock('../../lib/super-admin-auth', () => ({
  resolveSuperAdminSession: vi.fn().mockResolvedValue({ ok: false, response: new Response('Unauthorized', { status: 401 }) }),
}));

describe('/api/knowledge/capture security', () => {
  const ADMIN_TOKEN = 'test-admin-token';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN;
  });

  it('POST should return 401 when unauthenticated', async () => {
    const payload = {
      agent: 'test-agent',
      context: 'security test',
      insight: 'this should be protected',
    };

    const req = new Request('http://localhost/api/knowledge/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST should return 201 when authenticated with token', async () => {
    const payload = {
      agent: 'test-agent',
      context: 'security test',
      insight: 'this should be protected',
    };

    const req = new Request('http://localhost/api/knowledge/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('GET should return 401 when unauthenticated', async () => {
    const req = new Request('http://localhost/api/knowledge/capture');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('GET should return 200 when authenticated with token', async () => {
    const req = new Request('http://localhost/api/knowledge/capture', {
      headers: {
        'x-admin-token': ADMIN_TOKEN
      }
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
