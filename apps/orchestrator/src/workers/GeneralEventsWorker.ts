/**
 * Cola `general-events`: eventos de aplicación encolados por el Ingestion Bunker.
 * MVP: log estructurado; opcional reenvío HTTP si OPSLY_GENERAL_EVENTS_FORWARD_URL está definida.
 */
import { Job, Worker } from "bullmq";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { connection } from "../queue.js";
import { getWorkerConcurrency } from "../worker-concurrency.js";

export const GENERAL_EVENTS_QUEUE = "general-events";

export interface GeneralEventJobData {
  readonly type: string;
  readonly tenantId: string;
  readonly data: unknown;
  readonly receivedAt?: string;
  readonly headers?: Record<string, string>;
}

async function processGeneralEvent(job: Job<GeneralEventJobData>): Promise<void> {
  const t0 = Date.now();
  logWorkerLifecycle("start", "general-events", job);

  const forwardUrl = process.env.OPSLY_GENERAL_EVENTS_FORWARD_URL?.trim();
  if (forwardUrl && forwardUrl.length > 0) {
    const res = await fetch(forwardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job.data),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const snippet = (await res.text()).slice(0, 300);
      throw new Error(`Forward general-events ${res.status}: ${snippet}`);
    }
  } else {
    console.log(
      JSON.stringify({
        event: "general_event_ingested",
        jobId: job.id,
        type: job.data.type,
        tenantId: job.data.tenantId,
        receivedAt: job.data.receivedAt,
      }),
    );
  }

  logWorkerLifecycle("complete", "general-events", job, { duration_ms: Date.now() - t0 });
}

export function startGeneralEventsWorker(): Worker<GeneralEventJobData> {
  const concurrency = getWorkerConcurrency("general-events");
  return new Worker<GeneralEventJobData>(GENERAL_EVENTS_QUEUE, processGeneralEvent, {
    connection,
    concurrency,
  });
}
