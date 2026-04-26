import { createLangChainModel, type LangChainModelConfig } from './langchain';
import {
  applyLlamaIndexDefaults,
  createLlamaIndexConfig,
  type LlamaIndexConfig,
} from './llamaindex';

export interface AiFrameworkConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  temperature?: number;
  maxTokens?: number;
}

function toLangChainConfig(config: AiFrameworkConfig): LangChainModelConfig {
  return {
    provider: config.provider,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };
}

function toLlamaIndexConfig(config: AiFrameworkConfig): LlamaIndexConfig {
  return {
    provider: config.provider,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };
}

export function createAiIntegrations(config: AiFrameworkConfig): {
  langchain: ReturnType<typeof createLangChainModel>;
  llamaindex: ReturnType<typeof createLlamaIndexConfig>;
} {
  return {
    langchain: createLangChainModel(toLangChainConfig(config)),
    llamaindex: createLlamaIndexConfig(toLlamaIndexConfig(config)),
  };
}

export function applyAiDefaults(config: AiFrameworkConfig): void {
  applyLlamaIndexDefaults(toLlamaIndexConfig(config));
}
