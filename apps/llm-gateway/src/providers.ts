export type ProviderKind = 'anthropic' | 'ollama' | 'openrouter' | 'openai' | 'deepseek';

export interface ProviderDefinition {
  /** Model id for the upstream API */
  model: string;
  kind: ProviderKind;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  /** Base URL for non-Anthropic providers */
  baseUrl?: string;
  /** Redis health namespace (shared when several models use the same API) */
  healthKey: string;
}

const ollamaBase = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const openRouterBase = 'https://openrouter.ai/api/v1';
const deepseekBase = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/$/, '');
const deepseekModel =
  process.env.DEEPSEEK_MODEL?.trim() && process.env.DEEPSEEK_MODEL.trim().length > 0
    ? process.env.DEEPSEEK_MODEL.trim()
    : 'deepseek-v4-flash';

export const PROVIDERS = {
  claude_haiku: {
    model: 'claude-haiku-4-5-20251001',
    kind: 'anthropic',
    cost_per_1k_input: 0.00025,
    cost_per_1k_output: 0.00125,
    healthKey: 'anthropic',
  },
  claude_sonnet: {
    model: 'claude-sonnet-4-20250514',
    kind: 'anthropic',
    cost_per_1k_input: 0.003,
    cost_per_1k_output: 0.015,
    healthKey: 'anthropic',
  },
  llama_local: {
    model: process.env.OLLAMA_MODEL ?? 'nemotron-3-nano:4b',
    kind: 'ollama',
    cost_per_1k_input: 0,
    cost_per_1k_output: 0,
    baseUrl: ollamaBase.replace(/\/$/, ''),
    healthKey: 'llama_local',
  },
  /**
   * DeepSeek (API compatible OpenAI). Modelo por defecto V4 Flash.
   * Override: `DEEPSEEK_MODEL`, base: `DEEPSEEK_BASE_URL`.
   */
  deepseek_chat: {
    model: deepseekModel,
    kind: 'deepseek',
    cost_per_1k_input: 0.00014,
    cost_per_1k_output: 0.00028,
    baseUrl: deepseekBase,
    healthKey: 'deepseek',
  },
  openrouter_cheap: {
    model: 'mistralai/mistral-7b-instruct',
    kind: 'openrouter',
    cost_per_1k_input: 0.00002,
    cost_per_1k_output: 0.00006,
    baseUrl: openRouterBase,
    healthKey: 'openrouter',
  },
  gpt4o_mini: {
    model: 'gpt-4o-mini',
    kind: 'openai',
    cost_per_1k_input: 0.00015,
    cost_per_1k_output: 0.0006,
    healthKey: 'openai',
  },
  gpt4o: {
    model: 'gpt-4o',
    kind: 'openai',
    cost_per_1k_input: 0.005,
    cost_per_1k_output: 0.015,
    healthKey: 'openai',
  },
} as const satisfies Record<string, ProviderDefinition>;

export type ProviderId = keyof typeof PROVIDERS;

export interface ProviderChainEntry {
  id: ProviderId;
  healthKey: string;
  def: ProviderDefinition;
}

export type RoutingPreference = 'sonnet' | 'haiku' | 'cheap';

function deepseekChainEntry(): ProviderChainEntry | null {
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    return null;
  }
  return {
    id: 'deepseek_chat',
    healthKey: PROVIDERS.deepseek_chat.healthKey,
    def: PROVIDERS.deepseek_chat,
  };
}

export function getProvidersByPreference(preference: RoutingPreference): ProviderChainEntry[] {
  const e = (id: ProviderId): ProviderChainEntry => ({
    id,
    healthKey: PROVIDERS[id].healthKey,
    def: PROVIDERS[id],
  });
  const ds = deepseekChainEntry();

  if (preference === 'sonnet') {
    return [e('claude_sonnet'), e('gpt4o'), e('claude_haiku')];
  }
  if (preference === 'haiku') {
    const tail = [e('llama_local'), e('openrouter_cheap'), e('gpt4o_mini')];
    return ds ? [e('claude_haiku'), ds, ...tail] : [e('claude_haiku'), ...tail];
  }
  if (ds) {
    return [e('llama_local'), ds, e('claude_haiku'), e('openrouter_cheap')];
  }
  return [e('llama_local'), e('claude_haiku'), e('openrouter_cheap')];
}

export function resolveRoutingPreference(
  explicitModel: string | undefined,
  complexityLevel: 1 | 2 | 3
): RoutingPreference {
  if (explicitModel === 'sonnet') return 'sonnet';
  if (explicitModel === 'haiku') return 'haiku';
  if (explicitModel === 'cheap' || explicitModel === 'llama') return 'cheap';
  if (complexityLevel === 3) return 'sonnet';
  if (complexityLevel === 1) return 'cheap';
  return 'haiku';
}
