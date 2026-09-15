import { getOrchestratorRedis } from '../metering/redis-client.js';

const HEARTBEAT_TTL_SECONDS = 60;

export async function recordOrchestratorHeartbeat(
  serviceName: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const redis = getOrchestratorRedis();
  if (!redis) {
    return;
  }
  const key = `heartbeat:${serviceName}`;
  const payload = JSON.stringify({
    ts: Date.now(),
    metadata,
  });
  await redis.set(key, payload, 'EX', HEARTBEAT_TTL_SECONDS);
}


export interface OrchestratorHeartbeatLoopOptions {
  intervalMs?: number;
  record?: typeof recordOrchestratorHeartbeat;
  onError?: (error: unknown) => void;
}

export function startOrchestratorHeartbeatLoop(
  serviceName: string,
  metadata: Record<string, unknown> = {},
  options: OrchestratorHeartbeatLoopOptions = {}
): () => void {
  const intervalMs = options.intervalMs ?? 20_000;
  const record = options.record ?? recordOrchestratorHeartbeat;
  const onError =
    options.onError ??
    ((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[orchestrator-heartbeat]', message);
    });

  let stopped = false;
  let inFlight = false;

  const tick = async (): Promise<void> => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      await record(serviceName, metadata);
    } catch (error) {
      onError(error);
    } finally {
      inFlight = false;
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref?.();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}


export interface OrchestratorHeartbeatSnapshot {
  service_name: string;
  alive: boolean;
  ts: number | null;
  age_ms: number | null;
  metadata: Record<string, unknown>;
}

export async function readOrchestratorHeartbeat(
  serviceName: string,
  nowMs = Date.now()
): Promise<OrchestratorHeartbeatSnapshot> {
  const redis = getOrchestratorRedis();
  if (!redis) {
    return {
      service_name: serviceName,
      alive: false,
      ts: null,
      age_ms: null,
      metadata: {},
    };
  }

  const raw = await redis.get(`heartbeat:${serviceName}`);
  if (!raw) {
    return {
      service_name: serviceName,
      alive: false,
      ts: null,
      age_ms: null,
      metadata: {},
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      ts?: unknown;
      metadata?: unknown;
    };
    const ts = typeof parsed.ts === 'number' && Number.isFinite(parsed.ts) ? parsed.ts : null;
    const metadata =
      parsed.metadata && typeof parsed.metadata === 'object' && !Array.isArray(parsed.metadata)
        ? (parsed.metadata as Record<string, unknown>)
        : {};
    const ageMs = ts === null ? null : Math.max(0, nowMs - ts);
    return {
      service_name: serviceName,
      alive: ts !== null && ageMs !== null && ageMs <= HEARTBEAT_TTL_SECONDS * 1000,
      ts,
      age_ms: ageMs,
      metadata,
    };
  } catch {
    return {
      service_name: serviceName,
      alive: false,
      ts: null,
      age_ms: null,
      metadata: {},
    };
  }
}
