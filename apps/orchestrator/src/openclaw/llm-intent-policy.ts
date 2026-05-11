import type { Intent, IntentRequest } from '../types.js';

/** Prioridad de proveedor cloud en el LLM Gateway (`buildLlmDirectCloudChain`). */
export type LlmProviderHint = 'deepseek' | 'nvidia';

export interface LlmIntentPolicy {
  routing_bias?: 'cost' | 'balanced' | 'quality';
  /**
   * `undefined` = no tocar el hint previo.
   * `null` = forzar sin hint (cadena por `routing_bias` sola).
   */
  provider_hint?: LlmProviderHint | null;
}

/**
 * Alinea routing LLM con el tipo de trabajo: planner/ejecución barata → DeepSeek primero;
 * notificaciones / I/O ligero → coste sin hint (OpenRouter → DeepSeek → NVIDIA → …).
 * Enterprise en planner: `balanced` para no forzar solo cadena económica; sigue pudiendo usar hint en metadata.
 */
export function resolveLlmPolicyFromIntent(
  intent: Intent,
  plan?: IntentRequest['plan']
): LlmIntentPolicy {
  switch (intent) {
    case 'remote_plan':
    case 'sprint_plan':
      return {
        routing_bias: plan === 'enterprise' ? 'balanced' : 'cost',
        provider_hint: 'deepseek',
      };
    case 'oar_react':
    case 'execute_code':
    case 'full_pipeline':
    case 'trigger_workflow':
      return { routing_bias: 'cost', provider_hint: 'deepseek' };
    case 'notify':
    case 'sync_drive':
      return { routing_bias: 'cost', provider_hint: null };
    default:
      return {};
  }
}

const ROUTING_SET = new Set<string>(['cost', 'balanced', 'quality']);
const HINT_SET = new Set<string>(['deepseek', 'nvidia', 'none']);

/**
 * Overrides opcionales desde `metadata` (útil para jobs encolados o pruebas).
 * - `llm_routing_bias`: cost | balanced | quality
 * - `llm_provider_hint`: deepseek | nvidia | none (none = quitar hint)
 */
export function parseMetadataLlmOverrides(req: IntentRequest): LlmIntentPolicy {
  const raw = req.metadata;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const m = raw as Record<string, unknown>;
  const out: LlmIntentPolicy = {};

  const biasRaw = m.llm_routing_bias;
  if (typeof biasRaw === 'string' && ROUTING_SET.has(biasRaw)) {
    out.routing_bias = biasRaw as LlmIntentPolicy['routing_bias'];
  }

  const hintRaw = m.llm_provider_hint;
  if (typeof hintRaw === 'string' && HINT_SET.has(hintRaw)) {
    out.provider_hint = hintRaw === 'none' ? null : (hintRaw as LlmProviderHint);
  }

  return out;
}
