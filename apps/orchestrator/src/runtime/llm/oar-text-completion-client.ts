/**
 * Cliente ReAct → LLM Gateway `POST /v1/text` (contenido crudo, sin JSON de planner).
 *
 * @see apps/llm-gateway/src/text-completion-route.ts
 */

import { meterPlannerLlmFireAndForget } from '../../metering/usage-events-meter.js';
import type { ReActLlmGatewayClient } from '../strategies/react-engine.js';

function gatewayBaseUrl(): string {
  const raw =
    process.env.LLM_GATEWAY_URL ??
    process.env.ORCHESTRATOR_LLM_GATEWAY_URL ??
    'http://127.0.0.1:3010';
  return raw.replace(/\/$/, '');
}

export interface CreateOarTextCompletionClientOptions {
  tenantSlug: string;
  requestId: string;
  tenantId?: string;
  tenantPlan?: 'startup' | 'business' | 'enterprise';
  /** Override base URL (tests). */
  baseUrl?: string;
  /** Desactiva Hermes / Redis metering (tests). */
  meterTokens?: boolean;
}

/**
 * Implementa {@link ReActLlmGatewayClient} contra `/v1/text`; cada vuelta ReAct cuenta como una llamada medida.
 */
export function createOarTextCompletionClient(
  options: CreateOarTextCompletionClientOptions
): ReActLlmGatewayClient {
  const base = (options.baseUrl ?? gatewayBaseUrl()).replace(/\/$/, '');
  const meter = options.meterTokens !== false;

  return {
    async complete(_model: string, prompt: string): Promise<string> {
      const url = `${base}/v1/text`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: options.tenantSlug,
          request_id: options.requestId,
          tenant_plan: options.tenantPlan,
          prompt,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(
          `OAR llm-gateway /v1/text HTTP ${String(res.status)}: ${text.slice(0, 400)}`
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        throw new Error('OAR llm-gateway /v1/text: response is not JSON');
      }
      if (typeof parsed !== 'object' || parsed === null || !('content' in parsed)) {
        throw new Error('OAR llm-gateway /v1/text: missing content');
      }
      const content = (parsed as { content: unknown }).content;
      if (typeof content !== 'string') {
        throw new TypeError('OAR llm-gateway /v1/text: content must be a string');
      }

      if (meter) {
        const llm = (
          parsed as {
            llm?: { tokens_input?: unknown; tokens_output?: unknown; model_used?: unknown };
          }
        ).llm;
        const tokensIn = typeof llm?.tokens_input === 'number' ? llm.tokens_input : 0;
        const tokensOut = typeof llm?.tokens_output === 'number' ? llm.tokens_output : 0;
        const modelUsed = typeof llm?.model_used === 'string' ? llm.model_used : 'unknown';
        meterPlannerLlmFireAndForget(options.tenantSlug, options.tenantId, {
          model_used: modelUsed,
          tokens_input: tokensIn,
          tokens_output: tokensOut,
        });
      }

      return content;
    },
  };
}
