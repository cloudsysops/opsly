export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  tenant_slug: string;
  messages: LLMMessage[];
  system?: string;
  model?: "sonnet" | "haiku";
  max_tokens?: number;
  temperature?: number;
  cache?: boolean;
  session_id?: string;
}

export interface LLMResponse {
  content: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
  latency_ms: number;
}

export interface UsageEvent {
  tenant_slug: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
  session_id?: string;
  created_at: string;
}
