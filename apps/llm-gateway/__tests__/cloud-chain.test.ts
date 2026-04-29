import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildLlmDirectCloudChain } from '../src/cloud-chain.js';
import type { LLMRequest } from '../src/types.js';

function minimalReq(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return {
    tenant_slug: 'acme',
    messages: [{ role: 'user', content: 'hi' }],
    ...overrides,
  };
}

describe('buildLlmDirectCloudChain', () => {
  const savedKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = savedKey;
    }
  });

  it('puts DeepSeek first when provider_hint is deepseek', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ provider_hint: 'deepseek' }));
    expect(chain[0]?.id).toBe('deepseek_chat');
    expect(chain.map((e) => e.id)).toEqual(['deepseek_chat', 'claude_haiku', 'gpt4o_mini', 'openrouter_cheap']);
  });

  it('puts DeepSeek first when routing_bias is cost', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'cost' }));
    expect(chain[0]?.id).toBe('deepseek_chat');
  });

  it('puts DeepSeek last when routing_bias is quality', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'quality' }));
    expect(chain[chain.length - 1]?.id).toBe('deepseek_chat');
  });

  it('omits DeepSeek when API key is unset', () => {
    delete process.env.DEEPSEEK_API_KEY;
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'cost' }));
    expect(chain.some((e) => e.id === 'deepseek_chat')).toBe(false);
    expect(chain[0]?.id).toBe('claude_haiku');
  });
});
