import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.hoisted(() => vi.fn());
const cacheGetMock = vi.hoisted(() => vi.fn());
const cacheSetMock = vi.hoisted(() => vi.fn());
const logUsageMock = vi.hoisted(() => vi.fn());
const getTenantUsageMock = vi.hoisted(() => vi.fn());
const healthIsAvailableMock = vi.hoisted(() => vi.fn());
const notifyBudgetExceededMock = vi.hoisted(() => vi.fn());
const notifyBudgetWarningMock = vi.hoisted(() => vi.fn());
const notifyProviderRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: createMock,
    },
  })),
}));

vi.mock('../src/cache.js', () => ({
  cacheGet: (...args: unknown[]) => cacheGetMock(...args),
  cacheSet: (...args: unknown[]) => cacheSetMock(...args),
}));

vi.mock('../src/logger.js', () => ({
  logUsage: (...args: unknown[]) => logUsageMock(...args),
  getTenantUsage: (...args: unknown[]) => getTenantUsageMock(...args),
  mergeUsageAttribution: (req: unknown, base: unknown) => base,
}));

vi.mock('../src/health-daemon.js', () => ({
  healthDaemon: {
    isAvailable: (...args: unknown[]) => healthIsAvailableMock(...args),
  },
}));

vi.mock('../src/providers/discord.js', () => ({
  notifyBudgetExceeded: (...args: unknown[]) => notifyBudgetExceededMock(...args),
  notifyBudgetWarning: (...args: unknown[]) => notifyBudgetWarningMock(...args),
  notifyProviderRateLimit: (...args: unknown[]) => notifyProviderRateLimitMock(...args),
}));

import { GatewayHttpError, llmCallDirect } from '../src/llm-direct.js';
import { PROVIDERS } from '../src/providers.js';

describe('local-first policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('AI_PROFILE', 'hybrid');
    vi.stubEnv('DAILY_BUDGET_TEST', '1.0');
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
    cacheGetMock.mockResolvedValue(null);
    getTenantUsageMock.mockResolvedValue({
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0.01,
      requests: 1,
      cache_hits: 0,
      top_model: null,
    });
    healthIsAvailableMock.mockResolvedValue(true);
    notifyBudgetExceededMock.mockResolvedValue(undefined);
    notifyBudgetWarningMock.mockResolvedValue(undefined);
    notifyProviderRateLimitMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('Local OK devuelve provider local', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'respuesta local' },
          prompt_eval_count: 10,
          eval_count: 20,
        }),
      })
    );

    const out = await llmCallDirect({
      tenant_slug: 'test',
      messages: [{ role: 'user', content: 'hola' }],
      temperature: 0,
    });

    expect(out.content).toBe('respuesta local');
    expect(out.model_used).toBe(PROVIDERS.llama_local.model);
    expect(out.cost_usd).toBe(0);
  });

  it('Local falla y hace fallback cloud', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    );
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: 'respuesta cloud' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const out = await llmCallDirect({
      tenant_slug: 'test',
      messages: [{ role: 'user', content: 'hola cloud' }],
    });

    expect(out.content).toBe('respuesta cloud');
    expect(out.model_used).toContain('claude');
  });

  it('Budget superado devuelve 402', async () => {
    vi.stubEnv('DAILY_BUDGET_TEST', '0.01');
    getTenantUsageMock.mockResolvedValue({
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0.05,
      requests: 1,
      cache_hits: 0,
      top_model: null,
    });

    await expect(
      llmCallDirect({
        tenant_slug: 'test',
        messages: [{ role: 'user', content: 'hola' }],
      })
    ).rejects.toMatchObject({ statusCode: 402 } satisfies Partial<GatewayHttpError>);
  });

  it('429 en Claude hace retry/fallback cloud secundario', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'fallback openai' } }],
            usage: { prompt_tokens: 11, completion_tokens: 5 },
          }),
        })
    );
    createMock.mockRejectedValue(new Error('429 rate limit'));

    const out = await llmCallDirect({
      tenant_slug: 'test',
      messages: [{ role: 'user', content: 'hola 429' }],
    });

    expect(out.content).toBe('fallback openai');
    expect(out.model_used).toBe('gpt-4o-mini');
    expect(notifyProviderRateLimitMock).toHaveBeenCalled();
  });

  it('Loguea provider, latencia y costo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'respuesta local log' },
          prompt_eval_count: 4,
          eval_count: 8,
        }),
      })
    );

    await llmCallDirect({
      tenant_slug: 'test',
      messages: [{ role: 'user', content: 'log me' }],
    });

    expect(logUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test',
        model: PROVIDERS.llama_local.model,
        cost_usd: 0,
      })
    );
  });
});
