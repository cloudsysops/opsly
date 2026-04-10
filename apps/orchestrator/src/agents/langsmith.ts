/**
 * Bootstrap mínimo de tracing LangSmith/LangChain por variables de entorno.
 * No rompe ejecución si faltan credenciales.
 */
const DEFAULT_LANGCHAIN_PROJECT = "Opsly-Prod";

let initialized = false;

function hasLangSmithKey(): boolean {
  const key = process.env.LANGCHAIN_API_KEY?.trim();
  return typeof key === "string" && key.length > 0;
}

/**
 * Configura env vars estándar para que cualquier integración LangChain/LangSmith
 * pueda trazar automáticamente cuando la key está presente.
 */
export function setupLangSmithTracing(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  process.env.LANGCHAIN_PROJECT =
    process.env.LANGCHAIN_PROJECT?.trim() || DEFAULT_LANGCHAIN_PROJECT;

  if (!hasLangSmithKey()) {
    return;
  }

  process.env.LANGCHAIN_TRACING_V2 = "true";
  /**
   * Señal explícita para runtimes que inspeccionan callbacks por env
   * (observabilidad/depuración de prompts sin acoplar engine al SDK específico).
   */
  process.env.LANGCHAIN_CALLBACKS =
    process.env.LANGCHAIN_CALLBACKS?.trim() || "langsmith";
}
