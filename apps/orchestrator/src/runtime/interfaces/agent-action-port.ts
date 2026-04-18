/**
 * Puerto de ejecución de acciones del agente: API HTTP interna, encolado BullMQ o invocación MCP,
 * sin acoplar el OAR a un transporte concreto.
 *
 * @see docs/design/OAR.md — §4.2 AgentActionPort
 */

/**
 * Resultado normalizado de una acción atómica, listo para alimentar el loop (observation) del LLM.
 */
export interface ToolResult {
  /** Indica si la acción terminó sin error de aplicación. */
  success: boolean;
  /** Carga útil estructurada cuando aplica (p. ej. JSON parseado); ausente si no hay datos. */
  data?: unknown;
  /** Mensaje de error breve si `success` es false. */
  error?: string;
  /**
   * Representación en texto para el contexto del modelo (observación legible).
   * Obligatoria para que el runtime pueda continuar ReAct / Plan & Execute sin acoplarse al tipo de `data`.
   */
  observation: string;
}

/**
 * Ejecuta acciones en nombre del agente; el adaptador decide el mecanismo (HTTP, cola, MCP).
 */
export interface AgentActionPort {
  /**
   * Ejecuta una acción atómica en nombre del agente.
   * El puerto decide si es HTTP a API, un job en BullMQ o un MCP tool call.
   *
   * @param tenantSlug - Tenant para trazabilidad y políticas; obligatorio.
   * @param actionName - Identificador estable de la acción (convención interna o nombre de tool).
   * @param args - Argumentos serializables; sin `any`.
   */
  executeAction(
    tenantSlug: string,
    actionName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult>;
}
