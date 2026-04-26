/**
 * Tipos compartidos del Opsly Agentic Runtime (OAR): ciclo de vida y metadatos de run.
 *
 * @see docs/design/OAR.md — §5 Máquina de Estados del Ciclo de Vida
 */

/**
 * Fase actual de una ejecución orquestada por OAR (un job BullMQ puede mapearse 1:1 a un run).
 * Valores en minúsculas para logs y serialización JSON homogéneos.
 *
 * - `pending` — PENDING: job recibido, esperando ser procesado.
 * - `strategizing` — STRATEGIZING: decidiendo qué algoritmo usar.
 * - `thinking` — THINKING: LLM generando el próximo paso o el plan.
 * - `acting` — ACTING: ejecutando la acción vía `AgentActionPort`.
 * - `observing` — OBSERVING: procesando el resultado de la acción.
 * - `reflecting` — REFLECTING (opcional): validando resultados.
 * - `completed` — COMPLETED: tarea finalizada con éxito.
 * - `failed` — FAILED: tarea fallida (límite de iteraciones o error crítico).
 */
export type OarLifecycleState =
  | 'pending'
  | 'strategizing'
  | 'thinking'
  | 'acting'
  | 'observing'
  | 'reflecting'
  | 'completed'
  | 'failed';

/**
 * Constantes de estado para comparaciones y switches exhaustivos en implementaciones.
 */
export const OAR_LIFECYCLE: { readonly [K in OarLifecycleState]: K } = {
  pending: 'pending',
  strategizing: 'strategizing',
  thinking: 'thinking',
  acting: 'acting',
  observing: 'observing',
  reflecting: 'reflecting',
  completed: 'completed',
  failed: 'failed',
} as const;

/**
 * Indica si el estado es terminal (no hay más transiciones salvo un nuevo job).
 */
export function isOarTerminalState(state: OarLifecycleState): boolean {
  return state === 'completed' || state === 'failed';
}
