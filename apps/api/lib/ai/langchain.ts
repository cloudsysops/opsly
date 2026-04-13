import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";

export type LangChainProvider = "anthropic" | "openai";

export interface LangChainModelConfig {
  provider: LangChainProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 1024;

function resolveApiKey(provider: LangChainProvider): string {
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) {
      throw new Error("Missing ANTHROPIC_API_KEY for LangChain Anthropic integration");
    }
    return key;
  }

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY for LangChain OpenAI integration");
  }
  return key;
}

export function createLangChainModel(config: LangChainModelConfig): ChatAnthropic | ChatOpenAI {
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  if (config.provider === "anthropic") {
    return new ChatAnthropic({
      anthropicApiKey: resolveApiKey("anthropic"),
      model: config.model,
      temperature,
      maxTokens,
    });
  }

  return new ChatOpenAI({
    apiKey: resolveApiKey("openai"),
    model: config.model,
    temperature,
    maxTokens,
  });
}
