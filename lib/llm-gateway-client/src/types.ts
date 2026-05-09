/**
 * Type definitions for LLM Gateway client.
 */

export interface LLMRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

export interface LLMResponse {
  content: string;
  id?: string;
  model?: string;
  model_used?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
  cache_hit?: boolean;
  latency_ms?: number;
  [key: string]: unknown;
}
