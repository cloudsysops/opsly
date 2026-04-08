import type { JobsOptions } from "bullmq";
import type { OrchestratorJob } from "./types.js";

const MAX_JOB_ID_LEN = 128;

/**
 * BullMQ `jobId` solo acepta caracteres seguros; evita colisiones entre tipos.
 */
export function sanitizeQueueJobId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return cleaned.length <= MAX_JOB_ID_LEN ? cleaned : cleaned.slice(0, MAX_JOB_ID_LEN);
}

export function buildQueueAddOptions(job: OrchestratorJob): JobsOptions {
  const opts: JobsOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  };

  if (job.idempotency_key && job.idempotency_key.length > 0) {
    opts.jobId = sanitizeQueueJobId(`idem:${job.type}:${job.idempotency_key}`);
  }

  return opts;
}
