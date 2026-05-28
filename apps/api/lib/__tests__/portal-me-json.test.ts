import { describe, expect, it, vi } from 'vitest';
import { respondTrustedPortalMe } from '../portal-me-json';

vi.mock('../portal-me', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../portal-me')>();
  return {
    ...actual,
    portalUrlReachable: vi.fn().mockResolvedValue(true),
  };
});

describe('respondTrustedPortalMe', () => {
  it('omits sensitive credentials from services using explicit allow-list', async () => {
    const session = {
      user: { user_metadata: { mode: 'developer' } },
      tenant: {
        id: 't-123',
        slug: 'test-tenant',
        name: 'Test Tenant',
        plan: 'pro',
        status: 'ready',
        created_at: '2026-01-01',
        services: {
          n8n: 'https://n8n.example.com',
          n8n_basic_auth_user: 'admin',
          n8n_basic_auth_password: 'SECRET_PASSWORD',
          uptime: 'https://uptime.example.com',
        },
      },
      membership: { role: 'owner' },
    };

    const res = await respondTrustedPortalMe(session as any);
    const body = await res.json();

    // These should be present (mapped via resolvePortalServicesForTenant)
    expect(body.services.n8n_url).toBe('https://n8n.example.com');
    expect(body.services.uptime_url).toBe('https://uptime.example.com');

    // Credentials should be explicitly omitted by the allow-list in respondTrustedPortalMe
    expect(body.services.n8n_user).toBeUndefined();
    expect(body.services.n8n_password).toBeUndefined();

    // Raw internal keys should also not be present
    expect(body.services.n8n_basic_auth_user).toBeUndefined();
    expect(body.services.n8n_basic_auth_password).toBeUndefined();

    // Check total keys in services to ensure only allowed ones are there
    const serviceKeys = Object.keys(body.services);
    expect(serviceKeys).toContain('n8n_url');
    expect(serviceKeys).toContain('uptime_url');
    expect(serviceKeys.length).toBe(2);
  });
});
