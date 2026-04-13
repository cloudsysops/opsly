export type LangChainProvider = 'anthropic' | 'openai';

export interface LangChainModelConfig {
  provider: LangChainProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export function createLangChainModel(_config: LangChainModelConfig): unknown {
  throw new Error(
    'LangChain is not configured. Install @langchain/anthropic and @langchain/openai to use.'
  );
}
