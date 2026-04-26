/**
 * Session Manager — persiste y recupera sesiones de agente para continuidad.
 *
 * Integra con context-builder para almacenar:
 * - Resumen de la sesión (last decision, task summary)
 * - Historial de decisiones (routing decisions, enrichment context)
 * - Metadata de trazabilidad (request_id, task_id, timestamps)
 *
 * TTL por plan (desde context-builder):
 *   startup: 24h | business: 7d | enterprise: 30d
 */

import type { HermesTask } from '@intcloudsysops/types';
import {
  buildSessionKey,
  getAgentSession,
  saveAgentSession,
  type AgentSessionResponse,
} from './context-builder-client.js';

export interface DecisionRecord {
  task_id: string;
  timestamp: string;
  agent_type: string;
  routing_decision: Record<string, unknown>;
  enrichment_summary?: string;
  request_id?: string;
}

/**
 * Gestiona sesiones de agente para continuidad entre ejecuciones.
 */
export class SessionManager {
  /**
   * Crea o actualiza una sesión con el historial de decisiones.
   */
  async recordDecision(
    tenantSlug: string,
    task: HermesTask,
    decision: DecisionRecord
  ): Promise<boolean> {
    try {
      // Recuperar sesión existente para agregar al historial
      const existing = await getAgentSession(tenantSlug, task);
      const decisions = existing?.decisions ?? [];

      // Agregar nueva decisión al historial (limite a últimas 50 decisiones)
      const updatedDecisions = [
        ...decisions,
        {
          ...decision,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50);

      // Guardar sesión actualizada
      const result = await saveAgentSession(tenantSlug, task, {
        agent_role: 'executor',
        summary: `Last decision for task ${task.id}: ${decision.agent_type}`,
        decisions: updatedDecisions,
        open_items: existing?.open_items ?? [],
        metadata: {
          last_agent: decision.agent_type,
          decision_count: updatedDecisions.length,
          last_request_id: task.request_id,
        },
      });

      return result !== null;
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'session_manager_record_error',
          task_id: task.id,
          request_id: task.request_id,
          error: err instanceof Error ? err.message : String(err),
          ts: new Date().toISOString(),
        })
      );
      return false;
    }
  }

  /**
   * Recupera el contexto de sesión anterior (si existe y no expiró).
   */
  async getSessionContext(
    tenantSlug: string,
    task: HermesTask
  ): Promise<AgentSessionResponse | null> {
    try {
      return await getAgentSession(tenantSlug, task);
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el historial de decisiones de una sesión.
   */
  async getDecisionHistory(tenantSlug: string, task: HermesTask): Promise<DecisionRecord[]> {
    const session = await this.getSessionContext(tenantSlug, task);
    if (!session) return [];

    return (session.decisions as DecisionRecord[]) ?? [];
  }
}

export function createSessionManager(): SessionManager {
  return new SessionManager();
}
