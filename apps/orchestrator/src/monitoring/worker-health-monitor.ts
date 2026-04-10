/**
 * Worker Health Monitor — detecta workers muertos/atascados y los reinicia.
 *
 * Responsabilidades:
 *   1. Ping de liveness a cada worker mediante `worker.isRunning()`.
 *   2. Comprobación de jobs envejecidos (> STALLED_JOB_AGE_MS) en la cola.
 *   3. Restart automático del worker si lleva > MAX_SILENT_MS sin procesar jobs.
 *   4. Log estructurado de eventos de salud (`worker_health_check`, `worker_restarted`,
 *      `worker_unresponsive`).
 *   5. Discord alert si el worker no puede recuperarse.
 *
 * Uso típico (en apps/orchestrator/src/index.ts):
 *
 *   import { WorkerHealthMonitor } from "./monitoring/worker-health-monitor.js";
 *   const monitor = new WorkerHealthMonitor();
 *   monitor.register("cursor", cursorWorker, () => createCursorWorker());
 *   monitor.start();
 */

import { Worker } from "bullmq";
import Redis from "ioredis";

const CHECK_INTERVAL_MS = 5 * 60 * 1_000;  // check cada 5 min
const MAX_SILENT_MS     = 15 * 60 * 1_000; // worker considerado "muerto" si lleva 15 min sin actividad
const STALLED_JOB_AGE_MS = 10 * 60 * 1_000; // job activo > 10 min → stalled

let _redis: Redis | null = null;
function getRedis(): Redis {
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

interface WorkerEntry {
  name: string;
  worker: Worker;
  factory: () => Worker;
  lastSeen: number; // epoch ms del último job completado/fallado
  restarts: number;
}

export class WorkerHealthMonitor {
  private readonly entries = new Map<string, WorkerEntry>();
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Registra un worker para monitoreo. `factory` se usa para recrearlo si muere. */
  register(name: string, worker: Worker, factory: () => Worker): void {
    const entry: WorkerEntry = { name, worker, factory, lastSeen: Date.now(), restarts: 0 };
    this.entries.set(name, entry);

    // Actualizar lastSeen cuando el worker procesa algo
    worker.on("completed", () => { entry.lastSeen = Date.now(); });
    worker.on("failed", () => { entry.lastSeen = Date.now(); });
  }

  /** Inicia los checks periódicos. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.runChecks(); }, CHECK_INTERVAL_MS);
    console.info(
      JSON.stringify({
        event: "worker_health_monitor_started",
        workers: [...this.entries.keys()],
        check_interval_ms: CHECK_INTERVAL_MS,
        ts: new Date().toISOString(),
      }),
    );
  }

  /** Detiene los checks. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runChecks(): Promise<void> {
    for (const [name, entry] of this.entries) {
      await this.checkWorker(name, entry);
    }
  }

  private async checkWorker(name: string, entry: WorkerEntry): Promise<void> {
    const now = Date.now();
    const silent = now - entry.lastSeen;
    const isRunning = entry.worker.isRunning();

    console.info(
      JSON.stringify({
        event: "worker_health_check",
        worker: name,
        running: isRunning,
        silent_ms: silent,
        restarts: entry.restarts,
        ts: new Date().toISOString(),
      }),
    );

    if (!isRunning || silent > MAX_SILENT_MS) {
      await this.restartWorker(name, entry);
    }
  }

  private async restartWorker(name: string, entry: WorkerEntry): Promise<void> {
    entry.restarts++;
    console.warn(
      JSON.stringify({
        event: "worker_restarted",
        worker: name,
        restarts: entry.restarts,
        ts: new Date().toISOString(),
      }),
    );

    try {
      await entry.worker.close();
    } catch {
      // ignore close errors
    }

    try {
      const fresh = entry.factory();
      entry.worker = fresh;
      entry.lastSeen = Date.now();
      // Re-attach lifecycle listeners
      fresh.on("completed", () => { entry.lastSeen = Date.now(); });
      fresh.on("failed", () => { entry.lastSeen = Date.now(); });
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "worker_unresponsive",
          worker: name,
          restarts: entry.restarts,
          error: err instanceof Error ? err.message : String(err),
          ts: new Date().toISOString(),
        }),
      );
      await this.notifyDiscord(
        `🔴 Worker \`${name}\` unresponsive after ${entry.restarts} restarts`,
      );
    }
  }

  /** Verifica jobs envejecidos en Redis (stalled). */
  async checkStalledJobs(queueName: string): Promise<number> {
    const redis = getRedis();
    const activeKey = `bull:${queueName}:active`;
    const activeIds = await redis.lrange(activeKey, 0, -1);
    let stalled = 0;

    for (const id of activeIds) {
      const tsRaw = await redis.hget(`bull:${queueName}:${id}`, "processedOn");
      if (!tsRaw) continue;
      const age = Date.now() - Number(tsRaw);
      if (age > STALLED_JOB_AGE_MS) {
        stalled++;
        console.warn(
          JSON.stringify({
            event: "stalled_job_detected",
            queue: queueName,
            job_id: id,
            age_ms: age,
            ts: new Date().toISOString(),
          }),
        );
      }
    }

    return stalled;
  }

  private async notifyDiscord(message: string): Promise<void> {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{ title: message, color: 0xe74c3c, timestamp: new Date().toISOString() }],
        }),
      });
    } catch {
      // best-effort; don't crash the monitor
    }
  }
}
