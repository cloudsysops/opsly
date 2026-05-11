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
  const savedDeepseekKey = process.env.DEEPSEEK_API_KEY;
  const savedNvidiaKey = process.env.NVIDIA_API_KEY;

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    process.env.NVIDIA_API_KEY = 'test-nvidia-key';
  });

  afterEach(() => {
    if (savedDeepseekKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = savedDeepseekKey;
    }
    if (savedNvidiaKey === undefined) {
      delete process.env.NVIDIA_API_KEY;
    } else {
      process.env.NVIDIA_API_KEY = savedNvidiaKey;
    }
  });

  it('puts NVIDIA first when provider_hint is nvidia', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ provider_hint: 'nvidia' }));
    expect(chain.map((e: ProviderChainEntry) => e.id)).toEqual([
      'nvidia_nim',
      'deepseek_chat',
      'claude_haiku',
      'gpt4o_mini',
      'openrouter_cheap',
    ]);
  });

  it('puts DeepSeek first when provider_hint is deepseek', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ provider_hint: 'deepseek' }));
    expect(chain.map((e: ProviderChainEntry) => e.id)).toEqual([
      'deepseek_chat',
      'nvidia_nim',
      'claude_haiku',
      'gpt4o_mini',
      'openrouter_cheap',
    ]);
  });

  it('puts NVIDIA then DeepSeek first when routing_bias is cost', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'cost' }));
    expect(chain[0]?.id).toBe('nvidia_nim');
    expect(chain[1]?.id).toBe('deepseek_chat');
  });

  it('keeps NVIDIA after OpenAI mini when routing_bias is quality', () => {
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'quality' }));
    expect(chain.map((e: ProviderChainEntry) => e.id)).toEqual([
      'claude_haiku',
      'gpt4o_mini',
      'nvidia_nim',
      'openrouter_cheap',
      'deepseek_chat',
    ]);
  });

  it('omits NVIDIA and DeepSeek when API keys are unset', () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    const chain = buildLlmDirectCloudChain(minimalReq({ routing_bias: 'cost' }));
    expect(chain.some((e: ProviderChainEntry) => e.id === 'nvidia_nim')).toBe(false);
    expect(chain.some((e: ProviderChainEntry) => e.id === 'deepseek_chat')).toBe(false);
    expect(chain[0]?.id).toBe('claude_haiku');
  });
});
