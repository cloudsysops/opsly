/**
 * Contrato de memoria para el Opsly Agentic Runtime (OAR).
 * Las implementaciones concretas (Redis, Supabase/pgvector, etc.) viven fuera de esta interfaz.
 *
 * @see docs/design/OAR.md — §4.1 MemoryInterface
 */

/**
 * Fragmento devuelto por búsqueda semántica (RAG); origen y relevancia explícitos para trazabilidad.
 */
export interface MemoryFragment {
  /** Origen lógico del fragmento (p. ej. ruta de doc, identificador de conversación). */
  source: string;
  /** Contenido textual recuperado. */
  content: string;
  /** Puntuación de relevancia en el rango que defina el backend (p. ej. 0–1 o score del ranker). */
  relevanceScore: number;
}

/**
 * Acceso a memoria de trabajo, episódica y semántica, siempre acotado por `tenantSlug` (Zero-Trust).
 */
export interface MemoryInterface {
  /**
   * Lee el contexto de trabajo actual (memoria a corto plazo) para una sesión de agente.
   *
   * @param tenantSlug - Identificador del tenant; obligatorio en todas las rutas de memoria.
   * @param sessionId - Identificador de sesión OAR / correlación con el job.
   */
  getWorkingContext(tenantSlug: string, sessionId: string): Promise<Record<string, unknown>>;

  /**
   * Registra un hecho u observación en la memoria episódica (trazas de ejecución por paso).
   *
   * @param tenantSlug - Tenant al que pertenece la observación.
   * @param sessionId - Sesión asociada al run OAR.
   * @param step - Índice monotónico del paso dentro del loop (1-based o 0-based según implementación).
   * @param content - Texto de la observación para el LLM o auditoría.
   */
  appendObservation(
    tenantSlug: string,
    sessionId: string,
    step: number,
    content: string,
  ): Promise<void>;

  /**
   * Consulta memoria semántica (RAG); implementación típica futura con pgvector / embeddings.
   *
   * @param tenantSlug - Aislamiento por tenant.
   * @param query - Consulta en lenguaje natural o embedding según el adaptador.
   * @param limit - Tope de fragmentos a devolver.
   */
  querySemantic(tenantSlug: string, query: string, limit?: number): Promise<MemoryFragment[]>;
}
