export type Uuid = string;
export type TenantSlug = string;
export type IntentName = string;

export type TenantMode = 'live' | 'shadow' | 'demo';

export type WorkflowKind = 'webhook' | 'n8n' | 'internal';

export type PayloadFieldKind = 'string' | 'number' | 'boolean' | 'object';

export type EventStatus = 'accepted' | 'rejected' | 'dispatched' | 'failed';

export type AgentErrorCode =
  | 'UNKNOWN_TENANT'
  | 'INTENT_NOT_ALLOWED'
  | 'AI_PARSE_FAILED'
  | 'DISPATCH_FAILED';

export type AiProviderKind = 'mock' | 'gemini';

export interface WorkflowTarget {
  kind: WorkflowKind;
  ref: string;
}

export interface IntentDefinition {
  name: IntentName;
  description: string;
  workflow: WorkflowTarget;
  payloadSchema?: Readonly<Record<string, PayloadFieldKind>>;
}

export interface TenantConfig {
  slug: TenantSlug;
  displayName: string;
  mode: TenantMode;
  allowedIntents: readonly IntentName[];
  intents: Readonly<Record<IntentName, IntentDefinition>>;
  /** Tenant-owned keywords for mock AI routing (never hardcoded in core). */
  intentKeywords?: Readonly<Partial<Record<IntentName, readonly string[]>>>;
}

export interface ParsedIntent {
  intent: IntentName;
  payload: Readonly<Record<string, unknown>>;
  confidence: number;
}

export interface IntentRequest {
  tenantSlug: TenantSlug;
  utterance: string;
  requestId?: Uuid;
  actorId?: string;
}

export interface OpslyEvent {
  id: Uuid;
  requestId: Uuid;
  tenantSlug: TenantSlug;
  intent: IntentName;
  payload: Readonly<Record<string, unknown>>;
  status: EventStatus;
  createdAt: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface AgentRuntimeResult {
  event: OpslyEvent | null;
  error?: string;
  code?: AgentErrorCode;
}

export interface WorkflowDispatchResult {
  workflowRef: string;
  dispatched: boolean;
  detail?: string;
}

export interface EventLogRow {
  id: string;
  request_id: string;
  tenant_slug: string;
  intent: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}
