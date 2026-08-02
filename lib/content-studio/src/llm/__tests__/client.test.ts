import { afterEach, describe, expect, it } from 'vitest';
import { AnthropicDirectClient, GatewayClient, createLLMClient } from '../client.js';

const originalProvider = process.env.LLM_PROVIDER;
const originalDirectFlag = process.env.LLM_ALLOW_DIRECT_PROVIDER;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = originalProvider;
  if (originalDirectFlag === undefined) delete process.env.LLM_ALLOW_DIRECT_PROVIDER;
  else process.env.LLM_ALLOW_DIRECT_PROVIDER = originalDirectFlag;
  if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
});

describe('createLLMClient', () => {
  it('uses the Docker gateway by default', () => {
    delete process.env.LLM_PROVIDER;

    expect(createLLMClient('test-tenant')).toBeInstanceOf(GatewayClient);
  });

  it('rejects direct provider mode without explicit opt-in', () => {
    process.env.LLM_PROVIDER = 'anthropic-direct';
    delete process.env.LLM_ALLOW_DIRECT_PROVIDER;

    expect(() => createLLMClient()).toThrow('LLM_ALLOW_DIRECT_PROVIDER=true');
  });

  it('allows direct provider mode only with explicit opt-in', () => {
    process.env.LLM_PROVIDER = 'anthropic-direct';
    process.env.LLM_ALLOW_DIRECT_PROVIDER = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-only-key';

    expect(createLLMClient()).toBeInstanceOf(AnthropicDirectClient);
  });
});
