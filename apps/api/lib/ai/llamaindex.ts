import { Settings, type LLM } from "llamaindex";

export type LlamaIndexProvider = "anthropic" | "openai";

export interface LlamaIndexConfig {
  provider: LlamaIndexProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 1024;

function requireKey(envVar: "ANTHROPIC_API_KEY" | "OPENAI_API_KEY"): string {
  const value = process.env[envVar]?.trim();
  if (!value) {
    throw new Error(`Missing ${envVar} for LlamaIndex integration`);
  }
  return value;
}

export interface LlamaIndexRuntimeConfig extends LlamaIndexConfig {
  apiKey: string;
}

export function createLlamaIndexConfig(config: LlamaIndexConfig): LlamaIndexRuntimeConfig {
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  return {
    ...config,
    model: config.model,
    temperature,
    maxTokens,
    apiKey: config.provider === "anthropic" ? requireKey("ANTHROPIC_API_KEY") : requireKey("OPENAI_API_KEY"),
  };
}

export function applyLlamaIndexDefaults(config: LlamaIndexConfig, llm?: LLM): LlamaIndexRuntimeConfig {
  const resolved = createLlamaIndexConfig(config);

  // Optional: when caller already created a concrete LLM instance, apply it globally.
  if (llm) {
    Settings.llm = llm;
  }

  return resolved;
}
