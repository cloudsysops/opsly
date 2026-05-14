/**
 * Opsly Mode System — tipos alineados al registry y al middleware Redis.
 */

export type BillingPlan = 'startup' | 'business' | 'enterprise';

export type OpslyModeId =
  | 'developer'
  | 'security'
  | 'mentor'
  | 'ops'
  | 'analyst'
  | 'creative'
  | 'gamer'
  | 'quantum'
  | 'business'
  | 'minimal';

export interface ModeToolsPolicy {
  /** Nombres de tools MCP registradas, o `*` para todas. */
  allowed: string[];
}

export interface BuiltInModeDefinition {
  id: OpslyModeId;
  displayName: string;
  /** Plan mínimo del tenant para poder activar el modo (default: startup). */
  minPlan?: BillingPlan;
  tools: ModeToolsPolicy;
  /** Tras la allow-list, herramientas bloqueadas (admite `*`). */
  blockedTools?: string[];
}
