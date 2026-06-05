import type { AiProvider, AiProviderKind, IntentRequest, ParsedIntent, TenantConfig } from '../types/index.js';

export interface AiGateway extends AiProvider {
  readonly kind: AiProviderKind;
  parseIntent(request: IntentRequest, tenant: TenantConfig): Promise<ParsedIntent | null>;
}
