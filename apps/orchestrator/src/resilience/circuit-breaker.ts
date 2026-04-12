/**
 * Circuit Breaker — previene llamadas a un servicio que está fallando de forma repetida.
 *
 * Estados:
 *   CLOSED   → operación normal; cuenta fallos
 *   OPEN     → rechaza llamadas durante OPEN_DURATION_MS; protege al downstream
 *   HALF_OPEN → deja pasar UNA llamada de prueba; si OK → CLOSED; si falla → OPEN de nuevo
 *
 * El estado se guarda en Redis para que sea compartido entre réplicas del worker.
 * Si Redis no está disponible, opera en modo degradado (solo memoria del proceso).
 */

import Redis from "ioredis";

const FAILURE_THRESHOLD = 3;       // fallos consecutivos antes de abrir
const OPEN_DURATION_MS = 60_000;   // 60 s en estado OPEN
const HALF_OPEN_TIMEOUT_MS = 5_000; // máx. espera para la llamada de prueba

// Reutiliza la configuración de conexión de BullMQ (mismo host/port/password).
let _redis: Redis | null = null;
function getRedisClient(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    const parsed = new URL(url);
    _redis = new Redis({
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }
  return _redis;
}

export async function closeCircuitBreakerRedis(): Promise<void> {
  if (!_redis) {
    return;
  }
  _redis.disconnect();
  _redis = null;
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface BreakerSnapshot {
  state: CircuitState;
  failures: number;
  openedAt: number; // epoch ms; 0 si no está abierto
}

const DEFAULT_SNAPSHOT: BreakerSnapshot = { state: "CLOSED", failures: 0, openedAt: 0 };

function redisKey(name: string): string {
  return `circuit:${name}`;
}

async function readSnapshot(name: string): Promise<BreakerSnapshot> {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(redisKey(name));
    if (!raw) return { ...DEFAULT_SNAPSHOT };
    return JSON.parse(raw) as BreakerSnapshot;
  } catch {
    return { ...DEFAULT_SNAPSHOT };
  }
}

async function writeSnapshot(name: string, snap: BreakerSnapshot): Promise<void> {
  try {
    const redis = getRedisClient();
    // TTL = OPEN_DURATION_MS * 3 → auto-clean; estado CLOSED se mantiene indefinidamente si hay actividad
    const ttlSeconds = Math.ceil((OPEN_DURATION_MS * 3) / 1_000);
    await redis.set(redisKey(name), JSON.stringify(snap), "EX", ttlSeconds);
  } catch {
    // degraded mode: silently ignore redis errors
  }
}

/**
 * Ejecuta `fn` a través del circuit breaker `name`.
 *
 * @throws CircuitOpenError si el circuito está OPEN y no se ha cumplido el timeout
 * @throws el error original de `fn` si la llamada falla
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const snap = await readSnapshot(name);
  const now = Date.now();

  if (snap.state === "OPEN") {
    if (now - snap.openedAt < OPEN_DURATION_MS) {
      throw new CircuitOpenError(name, snap.openedAt + OPEN_DURATION_MS - now);
    }
    // Timeout expirado → pasar a HALF_OPEN
    snap.state = "HALF_OPEN";
    await writeSnapshot(name, snap);
  }

  try {
    // Wrap con timeout en HALF_OPEN para no bloquearnos en la llamada de prueba
    const result = snap.state === "HALF_OPEN"
      ? await withTimeout(fn(), HALF_OPEN_TIMEOUT_MS, `circuit ${name} half-open probe`)
      : await fn();

    // Éxito → cerrar circuito
    await writeSnapshot(name, { state: "CLOSED", failures: 0, openedAt: 0 });
    return result;
  } catch (err) {
    if (err instanceof CircuitOpenError) throw err;

    const failures = snap.failures + 1;
    if (failures >= FAILURE_THRESHOLD || snap.state === "HALF_OPEN") {
      await writeSnapshot(name, { state: "OPEN", failures, openedAt: Date.now() });
      console.error(
        JSON.stringify({
          event: "circuit_breaker_open",
          circuit: name,
          failures,
          reason: err instanceof Error ? err.message : String(err),
          ts: new Date().toISOString(),
        }),
      );
    } else {
      await writeSnapshot(name, { ...snap, failures });
    }
    throw err;
  }
}

/** Lee el estado actual sin modificarlo. */
export async function getCircuitState(name: string): Promise<CircuitState> {
  const snap = await readSnapshot(name);
  if (snap.state === "OPEN" && Date.now() - snap.openedAt >= OPEN_DURATION_MS) {
    return "HALF_OPEN";
  }
  return snap.state;
}

/** Resetea manualmente un circuito (útil en tests y runbooks de incidentes). */
export async function resetCircuit(name: string): Promise<void> {
  await writeSnapshot(name, { ...DEFAULT_SNAPSHOT });
}

export class CircuitOpenError extends Error {
  constructor(
    public readonly circuit: string,
    public readonly retryInMs: number,
  ) {
    super(`Circuit '${circuit}' is OPEN. Retry in ${Math.ceil(retryInMs / 1_000)}s.`);
    this.name = "CircuitOpenError";
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout after ${ms}ms: ${label}`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
