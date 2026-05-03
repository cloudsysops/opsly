/** Normaliza `undefined` / `null` a `null` para columnas opcionales en Supabase. */
export function coalesceNull<T>(value: T | undefined | null): T | null {
  return value === undefined || value === null ? null : value;
}
