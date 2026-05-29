import type { IntentRequest, ParsedIntent, TenantConfig } from '../types/index.js';

export interface AiGateway {
  parseIntent(request: IntentRequest, tenant: TenantConfig): Promise<ParsedIntent | null>;
}
