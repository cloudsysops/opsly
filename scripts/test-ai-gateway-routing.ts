/**
 * Pruebas locales: resolución `opsly:*` + fallback simulado 429 NVIDIA → OpenRouter.
 *
 *   npx tsx scripts/test-ai-gateway-routing.ts
 *
 * No llama a redes reales salvo que las claves estén definidas; el bloque 429 usa fetch mockeado.
 */

import { resolveOpslyRouting } from '../apps/api/lib/ai-gateway/router';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    throw new Error(msg);
  }
}

function testRouter(): void {
  process.env.NVIDIA_DEFAULT_MODEL = 'fallback-default';
  process.env.AI_ROUTE_FAST = 'route-fast';
  process.env.AI_ROUTE_CODING = 'route-coding';
  process.env.AI_ROUTE_SECURITY = 'route-sec';

  const r1 = resolveOpslyRouting({
    requestedModel: 'opsly:fast',
    metadata: undefined,
    messages: [{ role: 'user', content: 'x' }],
  });
  assert(r1.upstreamModel === 'route-fast', 'opsly:fast should map AI_ROUTE_FAST');

  const r2 = resolveOpslyRouting({
    requestedModel: 'opsly:auto',
    metadata: { opsly_route: 'coding' },
    messages: [{ role: 'user', content: 'x' }],
  });
  assert(r2.upstreamModel === 'route-coding', 'opsly:auto + metadata opsly_route=coding');

  const r3 = resolveOpslyRouting({
    requestedModel: 'opsly:auto',
    metadata: undefined,
    messages: [{ role: 'user', content: 'We need to refactor this TypeScript function' }],
  });
  assert(r3.effectiveBucket === 'coding', 'opsly:auto heuristic coding');

  const r4 = resolveOpslyRouting({
    requestedModel: 'opsly:auto',
    metadata: undefined,
    messages: [{ role: 'user', content: 'CVE-2024-0000 exploit in the wild' }],
  });
  assert(r4.effectiveBucket === 'security', 'opsly:auto heuristic security');
}

async function test429Fallback(): Promise<void> {
  process.env.NVIDIA_API_KEY = 'nv-test-key';
  process.env.OPENROUTER_API_KEY = 'or-test-key';
  process.env.AI_GATEWAY_PROVIDER_CHAIN = 'nvidia,openrouter';
  process.env.AI_ROUTE_FAST = 'm-fast';
  process.env.AI_GATEWAY_TIMEOUT_MS = '5000';
  process.env.AI_GATEWAY_MAX_PROMPT_CHARS = '50000';

  const originalFetch = globalThis.fetch;
  let nvidiaCalls = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('integrate.api.nvidia.com') || url.includes('nvidia.com')) {
      nvidiaCalls += 1;
      return new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('openrouter.ai')) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'openrouter-ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('unexpected url', { status: 500 });
  };

  try {
    const { runAiGatewayChat } = await import('../apps/api/lib/ai-gateway/gateway.ts');
    const out = await runAiGatewayChat({
      model: 'opsly:fast',
      messages: [{ role: 'user', content: 'hello' }],
      temperature: 0.1,
      max_tokens: 16,
    });
    assert(out.content === 'openrouter-ok', 'fallback body');
    assert(out.provider === 'openrouter', 'should end on openrouter');
    assert(nvidiaCalls === 2, `expected 2 nvidia attempts (retry), got ${nvidiaCalls}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main(): Promise<void> {
  testRouter();
  await test429Fallback();
  console.log('test-ai-gateway-routing: OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
