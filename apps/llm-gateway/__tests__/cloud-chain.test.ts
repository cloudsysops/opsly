import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildLlmDirectCloudChain } from '../src/cloud-chain.js';
import type { ProviderChainEntry } from '../src/providers.js';
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
  const savedOr = process.env.OPENROUTER_API_KEY;
  const savedNv = process.env.NVIDIA_API_KEY;

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NVIDIA_API_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = savedKey;
    }
    if (savedOr === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = savedOr;
    }
    if (savedNv === undefined) {
      delete process.env.NVIDIA_API_KEY;
    } else {
      process.env.NVIDIA_API_KEY = savedNv;
    }
  });

  it('puts NVIDIA first when provider_hint is nvidia', () => {
    process.env.NVIDIA_API_KEY = 'nv-test';
    const chain = buildLlmDirectCloudChain(minimalReq({ provider_hint: 'nvidia' }));
    expect(chain[0]?.id).toBe('nvidia_chat');
    expect(chain.map((e: ProviderChainEntry) => e.id)).toEqual([
      'nvidia_chat',
      'deepseek_chat',
      'claude_haiku',
      'gpt4o_mini',
    ]);
  });

  it('puts DeepSeek first when provider_hint is deepseek', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ provider_hint: 'deepseek' }));
    expect(chain[0]?.id).toBe('deepseek_chat');
    expect(chain.map((e: ProviderChainEntry) => e.id)).toEqual([
      'deepseek_chat',
      'claude_haiku',
      'gpt4o_mini',
    ]);
  });

  it('puts OpenRouter before DeepSeek when routing_bias is cost and OpenRouter key exists', () => {
    process.env.OPENROUTER_API_KEY = 'or-test';
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'cost' }));
    expect(chain.map((e: ProviderChainEntry) => e.id)).toEqual([
      'openrouter_cheap',
      'deepseek_chat',
      'claude_haiku',
      'gpt4o_mini',
    ]);
  });

  it('inserts NVIDIA after DeepSeek in cost chain when both keys exist', () => {
    process.env.OPENROUTER_API_KEY = 'or-test';
    process.env.NVIDIA_API_KEY = 'nv-test';
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'cost' }));
    expect(chain.map((e: ProviderChainEntry) => e.id)).toEqual([
      'openrouter_cheap',
      'deepseek_chat',
      'nvidia_chat',
      'claude_haiku',
      'gpt4o_mini',
    ]);
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
    expect(chain.some((e: ProviderChainEntry) => e.id === 'deepseek_chat')).toBe(false);
    expect(chain[0]?.id).toBe('claude_haiku');
  });
});
