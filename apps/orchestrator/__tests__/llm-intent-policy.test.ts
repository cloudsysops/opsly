import { describe, expect, it } from 'vitest';
import {
  parseMetadataLlmOverrides,
  resolveLlmPolicyFromIntent,
} from '../src/openclaw/llm-intent-policy.js';
import type { IntentRequest } from '../src/types.js';

describe('resolveLlmPolicyFromIntent', () => {
  it('prioriza DeepSeek en planner y OAR', () => {
    expect(resolveLlmPolicyFromIntent('remote_plan', 'startup')).toEqual({
      routing_bias: 'cost',
      provider_hint: 'deepseek',
    });
    expect(resolveLlmPolicyFromIntent('sprint_plan', 'business')).toEqual({
      routing_bias: 'cost',
      provider_hint: 'deepseek',
    });
    expect(resolveLlmPolicyFromIntent('oar_react', undefined)).toEqual({
      routing_bias: 'cost',
      provider_hint: 'deepseek',
    });
  });

  it('usa balanced en planner enterprise', () => {
    expect(resolveLlmPolicyFromIntent('remote_plan', 'enterprise')).toEqual({
      routing_bias: 'balanced',
      provider_hint: 'deepseek',
    });
  });

  it('notify y sync sin hint explícito', () => {
    expect(resolveLlmPolicyFromIntent('notify', undefined)).toEqual({
      routing_bias: 'cost',
      provider_hint: null,
    });
    expect(resolveLlmPolicyFromIntent('sync_drive', undefined)).toEqual({
      routing_bias: 'cost',
      provider_hint: null,
    });
  });
});

describe('parseMetadataLlmOverrides', () => {
  it('aplica overrides válidos', () => {
    const req = {
      intent: 'notify' as const,
      context: {},
      tenant_slug: 't',
      initiated_by: 'system' as const,
      metadata: {
        llm_routing_bias: 'quality',
        llm_provider_hint: 'nvidia',
      },
    } satisfies IntentRequest;
    expect(parseMetadataLlmOverrides(req)).toEqual({
      routing_bias: 'quality',
      provider_hint: 'nvidia',
    });
  });

  it('none limpia hint', () => {
    const req = {
      intent: 'notify' as const,
      context: {},
      tenant_slug: 't',
      initiated_by: 'system' as const,
      metadata: { llm_provider_hint: 'none' },
    } satisfies IntentRequest;
    expect(parseMetadataLlmOverrides(req)).toEqual({ provider_hint: null });
  });
});
