/**
 * LLMClient — abstraction over Anthropic SDK and the internal LLM Gateway.
 *
 * Usage:
 *   const client = createLLMClient();     // auto-detects via env LLM_PROVIDER
 *   const text   = await client.complete(system, user);
 */

export interface LLMClient {
  complete(system: string, user: string, maxTokens?: number): Promise<string>;
}

// ─── Anthropic Direct ─────────────────────────────────────────────────────────

export class AnthropicDirectClient implements LLMClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-5') {
    if (!apiKey) throw new Error('AnthropicDirectClient: ANTHROPIC_API_KEY is required');
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(system: string, user: string, maxTokens = 2048): Promise<string> {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '(no body)');
      throw new Error(`Anthropic API error ${resp.status}: ${body}`);
    }

    const data = (await resp.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const block = data.content.find((b) => b.type === 'text');
    if (!block) throw new Error('Anthropic returned no text content');
    return block.text;
  }
}

// ─── LLM Gateway (internal) ───────────────────────────────────────────────────

export class GatewayClient implements LLMClient {
  private readonly gatewayUrl: string;
  private readonly tenantSlug: string;

  constructor(
    tenantSlug: string,
    gatewayUrl = process.env.LLM_GATEWAY_URL ?? 'http://llm-gateway:3010'
  ) {
    this.tenantSlug = tenantSlug;
    this.gatewayUrl = gatewayUrl;
  }

  async complete(system: string, user: string, maxTokens = 2048): Promise<string> {
    const resp = await fetch(`${this.gatewayUrl}/v1/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: this.tenantSlug,
        system,
        messages: [{ role: 'user', content: user }],
        max_tokens: maxTokens,
        model: 'sonnet',
        skip_repo_context: true,
        feature: 'content_studio',
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '(no body)');
      throw new Error(`LLM Gateway error ${resp.status}: ${body}`);
    }

    const data = (await resp.json()) as { content?: string };
    if (!data.content) throw new Error('LLM Gateway returned no content');
    return data.content;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Auto-detects provider from env:
 *   LLM_PROVIDER=anthropic  → AnthropicDirectClient (needs ANTHROPIC_API_KEY)
 *   LLM_PROVIDER=gateway    → GatewayClient (needs LLM_GATEWAY_URL)
 *   (default)               → AnthropicDirectClient
 */
export function createLLMClient(tenantSlug = 'opsly'): LLMClient {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';

  if (provider === 'gateway') {
    return new GatewayClient(tenantSlug);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  return new AnthropicDirectClient(apiKey);
}
