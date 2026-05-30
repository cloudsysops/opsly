import type { AiGateway } from './gateway.js';
import type { AiProviderKind, IntentRequest, ParsedIntent, TenantConfig } from '../types/index.js';

export class AiProviderNotConfiguredError extends Error {
  readonly provider: AiProviderKind;

  constructor(provider: AiProviderKind) {
    super(
      `AI provider "${provider}" is not configured in opsly-core MVP. ` +
        'Use mock or gemini today, or wire @intcloudsysops/llm-gateway via a LlmPort adapter (Sprint 2).',
    );
    this.name = 'AiProviderNotConfiguredError';
    this.provider = provider;
  }
}

/** Controlled stub — provider kind exists in the contract but has no runtime wiring yet. */
export function createStubAiGateway(provider: AiProviderKind): AiGateway {
  return {
    kind: provider,
    async parseIntent(
      _request: IntentRequest,
      _tenant: TenantConfig,
    ): Promise<ParsedIntent | null> {
      throw new AiProviderNotConfiguredError(provider);
    },
  };
}
