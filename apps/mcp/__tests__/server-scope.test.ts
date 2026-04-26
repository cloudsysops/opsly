import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/api-client.js', () => ({
  opslyFetch: vi.fn().mockResolvedValue({ ok: true }),
}));

import { generateAccessToken } from '../src/auth/tokens.js';
import { createServer } from '../src/server.js';

describe('OpenClawMcpServer OAuth scopes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MCP_JWT_SECRET = 'unit-test-mcp-jwt-secret-32chars!';
    process.env.PLATFORM_ADMIN_TOKEN = 'unit-test-platform-admin-32chars!!';
  });

  it('allows tool when Bearer token has required scope', async () => {
    const token = generateAccessToken(
      'claude-ai',
      ['tenants:read', 'tenants:write'],
      undefined,
      600
    );
    const server = createServer();
    const out = await server.callTool('get_tenants', {}, { authorization: `Bearer ${token}` });
    expect(out).toEqual({ tenants: { ok: true } });
  });

  it('rejects when Bearer token lacks scope', async () => {
    const token = generateAccessToken('claude-ai', ['tenants:read'], undefined, 600);
    const server = createServer();
    await expect(
      server.callTool(
        'onboard_tenant',
        {
          slug: 'abc-slug-test',
          email: 'a@b.com',
          plan: 'startup',
          send_invitation: false,
        },
        { authorization: `Bearer ${token}` }
      )
    ).rejects.toThrow('Unauthorized');
  });

  it('accepts PLATFORM_ADMIN_TOKEN as Bearer for any tool', async () => {
    const server = createServer();
    const out = await server.callTool(
      'get_tenants',
      {},
      {
        authorization: `Bearer ${process.env.PLATFORM_ADMIN_TOKEN}`,
      }
    );
    expect(out).toEqual({ tenants: { ok: true } });
  });
});
