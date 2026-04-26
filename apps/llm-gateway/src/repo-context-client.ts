/**
 * Obtiene bloque XML de contexto Repo-First desde apps/context-builder (HTTP interno).
 * No usa vector DB; falla en silencio si el servicio no está disponible.
 */

const FETCH_TIMEOUT_MS = 8_000;

export async function fetchRepoContextBlock(query: string): Promise<string | null> {
  const base = process.env.CONTEXT_BUILDER_URL?.trim().replace(/\/$/, '');
  if (!base || query.length === 0) {
    return null;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    ctrl.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/v1/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { context?: unknown };
    return typeof data.context === 'string' && data.context.length > 0 ? data.context : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}
