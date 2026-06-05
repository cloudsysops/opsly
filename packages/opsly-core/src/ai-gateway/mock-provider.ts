import type { AiGateway } from './gateway.js';
import type { IntentRequest, ParsedIntent, IntentName, TenantConfig } from '../types/index.js';

function matchIntentByKeywords(
  utterance: string,
  tenant: TenantConfig,
): IntentName | null {
  const normalized = utterance.toLowerCase();

  for (const intent of Object.keys(tenant.intentKeywords ?? {}) as IntentName[]) {
    const keywords = tenant.intentKeywords?.[intent] ?? [];
    const matched = keywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase()),
    );
    if (matched) {
      return intent;
    }
  }

  return null;
}

function defaultPayloadForIntent(intent: IntentName): Record<string, unknown> {
  return { intent, source: 'mock-gateway' };
}

export function createMockGateway(): AiGateway {
  return {
    kind: 'mock',
    async parseIntent(
      request: IntentRequest,
      tenant: TenantConfig,
    ): Promise<ParsedIntent | null> {
      const intent = matchIntentByKeywords(request.utterance, tenant);
      if (!intent) {
        return null;
      }

      return {
        intent,
        payload: defaultPayloadForIntent(intent),
        confidence: 0.92,
      };
    },
  };
}
