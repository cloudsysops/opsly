/**
 * Respuesta segura para GET /api/ai/models: solo lectura de env, sin API keys ni cuerpos de error upstream.
 * Los ids deben validarse en NVIDIA Build antes de prod; vars vacías → null.
 */

const ROUTE_KEYS = [
  'fast',
  'architect',
  'coding',
  'reasoning',
  'security',
  'summary',
  'embeddings',
] as const;

const ROUTE_ENV: Record<(typeof ROUTE_KEYS)[number], string> = {
  fast: 'AI_ROUTE_FAST',
  architect: 'AI_ROUTE_ARCHITECT',
  coding: 'AI_ROUTE_CODING',
  reasoning: 'AI_ROUTE_REASONING',
  security: 'AI_ROUTE_SECURITY',
  summary: 'AI_ROUTE_SUMMARY',
  embeddings: 'AI_ROUTE_EMBEDDINGS',
};

const CATALOG_KEYS = [
  'MODEL_LLAMA_31_8B',
  'MODEL_LLAMA_31_70B',
  'MODEL_LLAMA_33_70B',
  'MODEL_NEMOTRON_70B',
  'MODEL_DEEPSEEK_R1',
  'MODEL_QWEN25_CODER',
  'MODEL_NV_EMBED',
] as const;

const AGENT_KEYS = ['HERMES_MODEL', 'ARCHITECT_MODEL', 'DEV_MODEL', 'QA_MODEL', 'SECURITY_MODEL'] as const;

function readOptional(key: string): string | null {
  const v = process.env[key]?.trim();
  return v !== undefined && v.length > 0 ? v : null;
}

function hasSecret(key: string): boolean {
  return readOptional(key) !== null;
}

export type PublicAiModelsPayload = {
  ok: true;
  provider: string;
  nvidia_base_url: string | null;
  default_chat_model: string;
  routes: Record<(typeof ROUTE_KEYS)[number], string | null>;
  catalog: Partial<Record<(typeof CATALOG_KEYS)[number], string | null>>;
  agents: Partial<Record<(typeof AGENT_KEYS)[number], string | null>>;
  providers_configured: {
    openai: boolean;
    anthropic: boolean;
    openrouter: boolean;
    ollama: boolean;
  };
  cache_observability: {
    AI_CACHE_ENABLED: string | null;
    AI_CACHE_TTL_SECONDS: string | null;
    AI_LOGGING_ENABLED: string | null;
    AI_TRACK_USAGE: string | null;
    AI_TRACK_COSTS: string | null;
  };
};

export function buildPublicAiModelsPayload(defaultChatModel: string): PublicAiModelsPayload {
  const hermesProvider = (process.env.HERMES_PROVIDER ?? process.env.AI_GATEWAY_PROVIDER ?? 'nvidia')
    .trim()
    .toLowerCase();
  const gatewayProvider = (process.env.AI_GATEWAY_PROVIDER ?? 'nvidia').trim().toLowerCase();
  const routes = {} as Record<(typeof ROUTE_KEYS)[number], string | null>;
  for (const k of ROUTE_KEYS) {
    routes[k] = readOptional(ROUTE_ENV[k]);
  }
  const catalog: Partial<Record<(typeof CATALOG_KEYS)[number], string | null>> = {};
  for (const k of CATALOG_KEYS) {
    const v = readOptional(k);
    if (v !== null) {
      catalog[k] = v;
    }
  }
  const agents: Partial<Record<(typeof AGENT_KEYS)[number], string | null>> = {};
  for (const k of AGENT_KEYS) {
    const v = readOptional(k);
    if (v !== null) {
      agents[k] = v;
    }
  }
  return {
    ok: true,
    provider: (process.env.AI_GATEWAY_PROVIDER ?? 'nvidia').trim().toLowerCase(),
    nvidia_base_url: readOptional('NVIDIA_BASE_URL'),
    default_chat_model: defaultChatModel,
    routes,
    catalog,
    agents,
    providers_configured: {
      openai: hasSecret('OPENAI_API_KEY'),
      anthropic: hasSecret('ANTHROPIC_API_KEY'),
      openrouter: hasSecret('OPENROUTER_API_KEY'),
      ollama: readOptional('OLLAMA_BASE_URL') !== null,
    },
    cache_observability: {
      AI_CACHE_ENABLED: readOptional('AI_CACHE_ENABLED'),
      AI_CACHE_TTL_SECONDS: readOptional('AI_CACHE_TTL_SECONDS'),
      AI_LOGGING_ENABLED: readOptional('AI_LOGGING_ENABLED'),
      AI_TRACK_USAGE: readOptional('AI_TRACK_USAGE'),
      AI_TRACK_COSTS: readOptional('AI_TRACK_COSTS'),
    },
  };
}
