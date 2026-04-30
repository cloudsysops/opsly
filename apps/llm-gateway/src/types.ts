import type { RoutingBias } from './routing-hints.js';

export type OutputChannel = 'api' | 'discord' | 'portal_chat' | 'cursor' | 'email';

export type TenantPlan = 'startup' | 'business' | 'enterprise';

export type IntentKind =
  | 'bug_fix'
  | 'feature_request'
  | 'refactor'
  | 'question'
  | 'deploy'
  | 'analysis'
  | 'config';

export type AffectedArea = 'frontend' | 'backend' | 'infra' | 'ml';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DetectedIntent {
  intent: IntentKind;
  confidence: number;
  affected_area: AffectedArea;
  urgency: UrgencyLevel;
  suggested_team: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  tenant_slug: string;
  messages: LLMMessage[];
  system?: string;
  /** Preferencia de ruta: sonnet | haiku | cheap (Llama primero) u otros alias. */
  model?: string;
  /**
   * Sesgo opcional sobre la ruta inferida por complejidad (solo si `model` no está fijado).
   * `cost` baja un escalón; `quality` sube; `balanced` = comportamiento por defecto.
   */
  routing_bias?: RoutingBias;
  /**
   * Prioriza un proveedor cloud concreto en `llmCallDirect` (p. ej. OpenClaw rol `skeptic` → DeepSeek).
   */
  provider_hint?: 'deepseek';
  max_tokens?: number;
  temperature?: number;
  cache?: boolean;
  session_id?: string;
  /** Plan del tenant para cola con prioridad y presupuesto (opcional; si falta se infiere o default startup). */
  tenant_plan?: TenantPlan;
  /** Canal de salida para formateo post-respuesta (v3). */
  output_channel?: OutputChannel;
  /** Si true, omite pipeline v3 (intent, enrich, scorer, etc.). */
  legacy_pipeline?: boolean;
  /** No escribe fila en usage_events (llamadas auxiliares: intent, scorer, reintentos intermedios). */
  skip_usage_log?: boolean;
  /** Correlación con orchestrator / clientes; si falta, el gateway genera uno en stdout. */
  request_id?: string;
  /**
   * Si true, no llama a context-builder (evita ruido en planner JSON, summarizer, tests).
   * @default false cuando `LLM_GATEWAY_REPO_CONTEXT=true`
   */
  skip_repo_context?: boolean;
  /** Usuario final (atribución billing / analytics); opcional. */
  user_id?: string;
  /** Área de producto, ej. legal_analysis, redaction; opcional. */
  feature?: string;
  /** Metadatos arbitrarios no sensibles persistidos en usage_events.metadata. */
  usage_metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
  latency_ms: number;
  /** Presente cuando la respuesta proviene de descomposición optimizada. */
  savings_usd?: number;
  /** v3: metadatos opcionales */
  intent?: DetectedIntent;
  quality_score?: number;
  formatted?: unknown;
  semantic_cache_hit?: boolean;
  budget_forced_cheap?: boolean;
}

export interface UsageEvent {
  tenant_slug: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
  session_id?: string;
  request_id?: string;
  created_at: string;
  quality_score?: number;
  user_id?: string;
  feature?: string;
  metadata?: Record<string, unknown>;
}
