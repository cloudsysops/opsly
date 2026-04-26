import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

const redisStore = new Map<string, string>();

vi.mock('@intcloudsysops/llm-gateway/cache', () => ({
  getRedisClient: vi.fn(async () => ({
    setEx: async (key: string, _ttl: number, value: string) => {
      redisStore.set(key, value);
    },
    get: async (key: string) => redisStore.get(key) ?? null,
    del: async (key: string) => {
      redisStore.delete(key);
      return 1;
    },
  })),
}));

function mockResponse(): {
  res: ServerResponse;
  status: { code: number; location?: string };
  /** Leer tras `await handleOAuthRequest` (no destructurar antes). */
  getBody: () => string;
} {
  const status = { code: 0, location: undefined as string | undefined };
  let body = '';
  const res = {
    setHeader: vi.fn(),
    writeHead: vi.fn((code: number, hdrs?: { Location?: string }) => {
      status.code = code;
      if (hdrs?.Location) {
        status.location = hdrs.Location;
      }
    }),
    end: (data?: string | Buffer) => {
      body = typeof data === 'string' ? data : (data?.toString('utf8') ?? '');
    },
  };
  return {
    res: res as unknown as ServerResponse,
    status,
    getBody: () => body,
  };
}

describe('handleOAuthRequest', () => {
  beforeEach(() => {
    redisStore.clear();
    vi.clearAllMocks();
    process.env.MCP_JWT_SECRET = 'unit-test-mcp-jwt-secret-32chars!';
  });

  it('discovery /.well-known/oauth-authorization-server incluye issuer y PKCE', async () => {
    const { handleOAuthRequest } = await import('../src/auth/oauth-server.js');
    const m = mockResponse();
    const req = { method: 'GET', headers: {} } as IncomingMessage;
    const handled = await handleOAuthRequest(
      req,
      m.res,
      '/.well-known/oauth-authorization-server',
      new URLSearchParams(),
      ''
    );
    expect(handled).toBe(true);
    expect(m.status.code).toBe(200);
    const meta = JSON.parse(m.getBody()) as Record<string, unknown>;
    expect(meta.issuer).toMatch(/^https?:\/\//);
    expect(meta.authorization_endpoint).toContain('/oauth/authorize');
    expect(meta.token_endpoint).toContain('/oauth/token');
    expect(meta.code_challenge_methods_supported).toEqual(['S256']);
    expect(meta.token_endpoint_auth_methods_supported).toEqual(['none']);
    expect(meta.grant_types_supported).toEqual(['authorization_code']);
  });

  it('authorize sin response_type → invalid_request', async () => {
    const { handleOAuthRequest } = await import('../src/auth/oauth-server.js');
    const m = mockResponse();
    const req = { method: 'GET', headers: {} } as IncomingMessage;
    const params = new URLSearchParams({
      client_id: 'claude-ai',
      redirect_uri: 'https://claude.ai/oauth/callback',
      code_challenge: 'abc',
      code_challenge_method: 'S256',
    });
    const handled = await handleOAuthRequest(req, m.res, '/oauth/authorize', params, '');
    expect(handled).toBe(true);
    expect(m.status.code).toBe(400);
    expect(JSON.parse(m.getBody()).error).toBe('invalid_request');
  });

  it('authorize con response_type=code y PKCE válido redirige con code', async () => {
    const { handleOAuthRequest } = await import('../src/auth/oauth-server.js');
    const { generateCodeVerifier, generateCodeChallenge } = await import('../src/auth/pkce.js');
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    const { res, status } = mockResponse();
    const req = { method: 'GET', headers: {} } as IncomingMessage;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'claude-ai',
      redirect_uri: 'https://claude.ai/oauth/callback',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'tenants:read',
    });

    const ok = await handleOAuthRequest(req, res, '/oauth/authorize', params, '');
    expect(ok).toBe(true);
    expect(status.code).toBe(302);
    expect(status.location).toMatch(/^https:\/\/claude\.ai\/oauth\/callback\?/);
    expect(status.location).toContain('code=');
  });

  it('token intercambia code por access_token (PKCE)', async () => {
    const { handleOAuthRequest } = await import('../src/auth/oauth-server.js');
    const { generateCodeVerifier, generateCodeChallenge } = await import('../src/auth/pkce.js');
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    const r1 = mockResponse();
    await handleOAuthRequest(
      { method: 'GET', headers: {} } as IncomingMessage,
      r1.res,
      '/oauth/authorize',
      new URLSearchParams({
        response_type: 'code',
        client_id: 'claude-ai',
        redirect_uri: 'https://claude.ai/oauth/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        scope: 'tenants:read',
      }),
      ''
    );
    const loc = r1.status.location ?? '';
    const code = new URL(loc).searchParams.get('code');
    expect(code).toBeTruthy();

    const r2 = mockResponse();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code ?? '',
      code_verifier: verifier,
      client_id: 'claude-ai',
    }).toString();

    await handleOAuthRequest(
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      } as IncomingMessage,
      r2.res,
      '/oauth/token',
      new URLSearchParams(),
      body
    );

    expect(r2.status.code).toBe(200);
    const tokenJson = JSON.parse(r2.getBody()) as { access_token: string; token_type: string };
    expect(tokenJson.token_type).toBe('Bearer');
    expect(tokenJson.access_token.split('.')).toHaveLength(3);
  });
});
