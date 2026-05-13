export type ProviderKind =
  | 'anthropic'
  | 'ollama'
  | 'openrouter'
  | 'openai'
  | 'deepseek'
  | 'nvidia'
  | 'groq';

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

const nvidiaBase = (process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1').replace(
  /\/$/,
  ''
);
const nvidiaModel =
  process.env.NVIDIA_MODEL_ID?.trim() && process.env.NVIDIA_MODEL_ID.trim().length > 0
    ? process.env.NVIDIA_MODEL_ID.trim()
    : 'meta/llama-3.1-8b-instruct';

const groqBase = (process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const groqModel =
  process.env.GROQ_MODEL_ID?.trim() && process.env.GROQ_MODEL_ID.trim().length > 0
    ? process.env.GROQ_MODEL_ID.trim()
    : 'llama-3.3-70b-versatile';

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
  deepseek_v4: {
    model: 'deepseek-v4',
    kind: 'deepseek',
    cost_per_1k_input: 0.0004,
    cost_per_1k_output: 0.0016,
    baseUrl: deepseekBase,
    healthKey: 'deepseek',
  },
  codellama_local: {
    model: 'codellama:34b',
    kind: 'ollama',
    cost_per_1k_input: 0,
    cost_per_1k_output: 0,
    baseUrl: ollamaBase.replace(/\/$/, ''),
    healthKey: 'codellama_local',
  },
  openrouter_cheap: {
    model: 'mistralai/mistral-7b-instruct-v0.1',
    kind: 'openrouter',
    cost_per_1k_input: 0.00002,
    cost_per_1k_output: 0.00006,
    baseUrl: openRouterBase,
    healthKey: 'openrouter',
  },
  /**
   * NVIDIA API Catalog (OpenAI-compatible). Requiere `NVIDIA_API_KEY` en runtime.
   * Modelo/base vía Doppler: `NVIDIA_MODEL_ID`, `NVIDIA_BASE_URL` (opcional).
   */
  nvidia_chat: {
    model: nvidiaModel,
    kind: 'nvidia',
    cost_per_1k_input: 0.0001,
    cost_per_1k_output: 0.0002,
    baseUrl: nvidiaBase,
    healthKey: 'nvidia',
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
  groq_chat: {
    model: groqModel,
    kind: 'groq',
    cost_per_1k_input: 0,
    cost_per_1k_output: 0,
    baseUrl: groqBase,
    healthKey: 'groq',
  },
} as const satisfies Record<string, ProviderDefinition>;

export type ProviderId = keyof typeof PROVIDERS;

export interface ProviderChainEntry {
  id: ProviderId;
  healthKey: string;
  def: ProviderDefinition;
}

export type RoutingPreference = 'sonnet' | 'haiku' | 'cheap' | 'balanced' | 'code';

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

function nvidiaChainEntry(): ProviderChainEntry | null {
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    return null;
  }
  return {
    id: 'nvidia_chat',
    healthKey: PROVIDERS.nvidia_chat.healthKey,
    def: PROVIDERS.nvidia_chat,
  };
}

function groqChainEntry(): ProviderChainEntry | null {
  if (!process.env.GROQ_API_KEY?.trim()) {
    return null;
  }
  return {
    id: 'groq_chat',
    healthKey: PROVIDERS.groq_chat.healthKey,
    def: PROVIDERS.groq_chat,
  };
}

export function getProvidersByPreference(preference: RoutingPreference): ProviderChainEntry[] {
  const e = (id: ProviderId): ProviderChainEntry => ({
    id,
    healthKey: PROVIDERS[id].healthKey,
    def: PROVIDERS[id],
  });
  const ds = deepseekChainEntry();
  const gq = groqChainEntry();

  if (preference === 'sonnet') {
    return [e('claude_sonnet'), e('gpt4o'), e('claude_haiku')];
  }
  if (preference === 'haiku') {
    const mid: ProviderChainEntry[] = [];
    if (gq) mid.push(gq);
    if (ds) mid.push(ds);
    const tail = [e('llama_local'), e('openrouter_cheap'), e('gpt4o_mini')];
    return [e('claude_haiku'), ...mid, ...tail];
  }
  if (preference === 'balanced') {
    if (ds) {
      const parts: ProviderChainEntry[] = [
        e('deepseek_v4'),
        e('claude_sonnet'),
        e('deepseek_chat'),
      ];
      const nv = nvidiaChainEntry();
      if (nv) parts.push(nv);
      if (gq) parts.push(gq);
      parts.push(e('claude_haiku'));
      return parts;
    }
    const parts: ProviderChainEntry[] = [e('claude_sonnet'), e('claude_haiku'), e('gpt4o_mini')];
    if (gq) parts.push(gq);
    parts.push(e('openrouter_cheap'));
    return parts;
  }
  if (preference === 'code') {
    const tail = ds ? [e('deepseek_chat')] : [];
    return [e('codellama_local'), e('gpt4o'), ...tail, e('llama_local')];
  }
  const nv = nvidiaChainEntry();
  if (ds) {
    const mid: ProviderChainEntry[] = [e('llama_local'), e('deepseek_chat')];
    if (gq) mid.push(gq);
    if (nv) mid.push(nv);
    mid.push(e('claude_haiku'), e('openrouter_cheap'));
    return mid;
  }
  const mid: ProviderChainEntry[] = [e('llama_local')];
  if (gq) mid.push(gq);
  if (nv) mid.push(nv);
  mid.push(e('claude_haiku'), e('openrouter_cheap'));
  return mid;
}

export function resolveRoutingPreference(
  explicitModel: string | undefined,
  complexityLevel: 1 | 2 | 3
): RoutingPreference {
  if (explicitModel === 'sonnet') return 'sonnet';
  if (explicitModel === 'haiku') return 'haiku';
  if (explicitModel === 'cheap' || explicitModel === 'llama') return 'cheap';
  if (explicitModel === 'balanced') return 'balanced';
  if (explicitModel === 'code') return 'code';
  if (complexityLevel === 3) return 'sonnet';
  if (complexityLevel === 2) return 'balanced';
  if (complexityLevel === 1) return 'cheap';
  return 'haiku';
}
