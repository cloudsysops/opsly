/**
 * Allowlist opcional de workers BullMQ (nodos efímeros / best-effort).
 *
 * `OPSLY_WORKER_ALLOWLIST` — lista CSV de nombres lógicos (p. ej. `ollama,notify`).
 * Vacío / ausente → arrancar todos (comportamiento histórico).
 *
 * Uso en PC-gamer prestado: `OPSLY_WORKER_ALLOWLIST=ollama` para no competir
 * por jobs de prod ni completar jobs ajenos en la cola compartida.
 */
export function parseWorkerAllowlist(
  raw: string | undefined = process.env.OPSLY_WORKER_ALLOWLIST
): Set<string> | null {
  const trimmed = raw?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  const names = trimmed
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  if (names.length === 0) {
    return null;
  }
  return new Set(names);
}

export function isWorkerAllowed(
  workerKey: string,
  allowlist: Set<string> | null = parseWorkerAllowlist()
): boolean {
  if (allowlist === null) {
    return true;
  }
  return allowlist.has(workerKey.trim().toLowerCase());
}
