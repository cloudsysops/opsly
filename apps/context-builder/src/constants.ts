/** Prefijo Redis para caché de contexto Repo-First (24h). */
export const REDIS_CTX_PREFIX = 'opsly:ctx:';

/** TTL del contexto ensamblado (segundos) — 24 h. */
export const CONTEXT_CACHE_TTL_SECONDS = 86_400;

/** Máximo de caracteres de documentación inyectada (aprox. presupuesto de tokens). */
export const MAX_CONTEXT_CHARS = 48_000;

/** Máximo de ficheros .md a incluir por consulta. */
export const MAX_CONTEXT_FILES = 8;
