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
  id: string;
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  [key: string]: unknown;
}
