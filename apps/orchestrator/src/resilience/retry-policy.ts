/**
 * Retry Policy — reintenta operaciones fallidas con backoff exponencial + jitter.
 *
 * Backoff formula: min(base * 2^attempt, maxDelay) + jitter(0..jitterCap)
 *
 * Buenas prácticas:
 *   - No reintentar errores del cliente (4xx); solo errores transitorios del servidor/red.
 *   - El caller puede pasar `shouldRetry` para personalizar qué errores son retriables.
 *   - BullMQ ya tiene su propio retry config (`attempts`, `backoff`); esta función es para
 *     llamadas HTTP internas (LLM Gateway, Supabase, GitHub API) fuera de la cola.
 */

export interface RetryOptions {
  /** Número máximo de intentos totales (incluyendo el primero). Default: 4 */
  maxAttempts?: number;
  /** Delay base en ms para el primer reintento. Default: 500 */
  baseDelayMs?: number;
  /** Delay máximo en ms (cap). Default: 30_000 */
  maxDelayMs?: number;
  /** Jitter máximo añadido al delay calculado. Default: 200 */
  jitterMs?: number;
  /** Función que decide si un error es retriable. Default: siempre true. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** Callback opcional para observabilidad antes de cada reintento. */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULTS = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitterMs: 200,
} as const;

/**
 * Ejecuta `fn` con reintentos según la política configurada.
 *
 * @example
 * const result = await withRetry(() => fetch("https://api.example.com"), {
 *   maxAttempts: 3,
 *   shouldRetry: (err) => isTransient(err),
 * });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts;
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const jitterMs = options.jitterMs ?? DEFAULTS.jitterMs;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLast = attempt === maxAttempts;
      if (isLast || !shouldRetry(err, attempt)) {
        break;
      }

      const delay = computeDelay(attempt, baseDelayMs, maxDelayMs, jitterMs);

      if (options.onRetry) {
        options.onRetry(err, attempt, delay);
      } else {
        console.warn(
          JSON.stringify({
            event: "retry_attempt",
            attempt,
            maxAttempts,
            delayMs: delay,
            error: err instanceof Error ? err.message : String(err),
            ts: new Date().toISOString(),
          }),
        );
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/** Calcula el delay con backoff exponencial + jitter aleatorio. */
export function computeDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterMs: number,
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, maxDelayMs);
  const jitter = Math.random() * jitterMs;
  return Math.floor(capped + jitter);
}

/** Determina si un error HTTP es transitorio (5xx, 429, errores de red). */
export function isTransientError(err: unknown): boolean {
  if (err instanceof TransientError) return true;
  if (!(err instanceof Error)) return false;

  const msg = err.message.toLowerCase();
  // Network/DNS errors
  if (msg.includes("fetch failed") || msg.includes("econnreset") || msg.includes("enotfound")) {
    return true;
  }
  // HTTP status in message (common pattern in this codebase)
  const statusMatch = msg.match(/\b(429|500|502|503|504)\b/);
  return statusMatch !== null;
}

/** Marca explícitamente un error como transitorio. */
export class TransientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TransientError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
