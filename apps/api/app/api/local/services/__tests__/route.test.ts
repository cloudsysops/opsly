import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

const originalEnv = { ...process.env };

describe('GET /api/local/services', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ALLOW_LOCAL_SERVICES_API;
    delete process.env.OLLAMA_URL;
    delete process.env.MCP_LLM_GATEWAY_URL;
    process.env.NODE_ENV = 'development';
    process.env.PORT = '3000';
    process.env.LOCAL_ADMIN_PORT = '3001';
    process.env.LOCAL_PORTAL_PORT = '3002';
    process.env.LOCAL_MCP_PORT = '3003';
    process.env.LOCAL_LLM_GATEWAY_PORT = '3010';
    process.env.LOCAL_ORCHESTRATOR_PORT = '3011';
    process.env.LOCAL_CONTEXT_BUILDER_PORT = '3012';
    process.env.LOCAL_SERVICES_HOST = '127.0.0.1';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('returns 403 when disabled (non-development and no flag)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_LOCAL_SERVICES_API;

    const res = await GET(new Request('http://localhost/api/local/services'));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('LOCAL_SERVICES_DISABLED');
  });

  it('returns 200 catalog without probe in development', async () => {
    const res = await GET(new Request('http://localhost/api/local/services'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      services: Array<{ id: string; health_url: string }>;
      generated_at?: string;
    };
    expect(body.services.length).toBeGreaterThanOrEqual(7);
    const api = body.services.find((s) => s.id === 'api');
    expect(api?.health_url).toBe('http://127.0.0.1:3000/api/health');
    expect(body.generated_at).toBeDefined();
  });

  it('includes Ollama when OLLAMA_URL is set', async () => {
    process.env.OLLAMA_URL = 'http://100.80.41.29:11434';
    const res = await GET(new Request('http://localhost/api/local/services'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { services: Array<{ id: string; health_url: string }> };
    const ollama = body.services.find((s) => s.id === 'ollama');
    expect(ollama?.health_url).toBe('http://100.80.41.29:11434/api/tags');
  });

  it('respects MCP_LLM_GATEWAY_URL over default port', async () => {
    process.env.MCP_LLM_GATEWAY_URL = 'http://gateway.internal:3010';
    const res = await GET(new Request('http://localhost/api/local/services'));
    const body = (await res.json()) as { services: Array<{ id: string; base_url: string }> };
    const g = body.services.find((s) => s.id === 'llm_gateway');
    expect(g?.base_url).toBe('http://gateway.internal:3010');
  });

  it('runs probes when probe=1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })
    );

    const res = await GET(new Request('http://localhost/api/local/services?probe=1'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      services: Array<{ probe?: { ok: boolean; status: number } }>;
    };
    expect(body.services[0]?.probe?.ok).toBe(true);
    expect(body.services[0]?.probe?.status).toBe(200);
  });

  it('enables in production when ALLOW_LOCAL_SERVICES_API=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_LOCAL_SERVICES_API = 'true';

    const res = await GET(new Request('http://localhost/api/local/services'));
    expect(res.status).toBe(200);
  });
});
