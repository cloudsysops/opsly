/** Cache en memoria para consultas NotebookLM (TTL 5 min). No usar en hot path crítico sin medir. */

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getNotebookLmCache<T>(key: string): T | null {
  const row = store.get(key);
  if (!row || Date.now() > row.expiresAt) {
    store.delete(key);
    return null;
  }
  return row.value as T;
}

export function setNotebookLmCache<T>(key: string, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}
