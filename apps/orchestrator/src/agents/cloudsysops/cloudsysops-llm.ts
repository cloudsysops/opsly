import { createOarTextCompletionClient } from '../../runtime/llm/oar-text-completion-client.js';
import type { ReActLlmGatewayClient } from '../../runtime/strategies/react-engine.js';

export interface CloudSysOpsLlmContext {
  tenantSlug: string;
  requestId: string;
  tenantId?: string;
  tenantPlan?: 'startup' | 'business' | 'enterprise';
  baseUrl?: string;
  meterTokens?: boolean;
  /** Inyección para tests (evita red). */
  client?: ReActLlmGatewayClient;
}

/**
 * Una llamada al LLM Gateway `/v1/text` con system + user concatenados (sin SDK Anthropic directo).
 */
export async function callCloudSysOpsLlm(
  ctx: CloudSysOpsLlmContext,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client =
    ctx.client ??
    createOarTextCompletionClient({
      tenantSlug: ctx.tenantSlug,
      requestId: ctx.requestId,
      tenantId: ctx.tenantId,
      tenantPlan: ctx.tenantPlan,
      baseUrl: ctx.baseUrl,
      meterTokens: ctx.meterTokens,
    });
  const combined = [
    systemPrompt.trim(),
    '',
    '---',
    '',
    userPrompt.trim(),
    '',
    'Reply with a single JSON object only. No markdown fences, no commentary.',
  ].join('\n');
  return client.complete('gateway', combined);
}
