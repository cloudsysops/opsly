import { createHmac } from "node:crypto";
import { Job, Queue, Worker } from "bullmq";
import { connection } from "../queue.js";
import type { WebhookPayload } from "./webhook-types.js";

export const WEBHOOK_QUEUE = "opsly-webhooks";

export interface WebhookJobData {
  webhookId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
}

export const webhookQueue = new Queue<WebhookJobData>(WEBHOOK_QUEUE, { connection });

function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function deliverWebhook(job: Job<WebhookJobData>): Promise<void> {
  const { url, secret, payload } = job.data;
  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Opsly-Signature": signature,
      "X-Opsly-Event": payload.event,
      "X-Opsly-Delivery": job.id ?? "unknown",
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Webhook delivery failed: ${res.status} ${res.statusText}`);
  }
}

export function createWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(WEBHOOK_QUEUE, deliverWebhook, {
    connection,
    concurrency: 10,
  });

  worker.on("active", (job) => {
    console.log(JSON.stringify({
      event: "worker_start",
      worker: "WebhookWorker",
      jobId: job.id,
      webhookId: job.data.webhookId,
      webhookEvent: job.data.payload.event,
    }));
  });

  worker.on("completed", (job) => {
    console.log(JSON.stringify({
      event: "worker_complete",
      worker: "WebhookWorker",
      jobId: job.id,
      webhookId: job.data.webhookId,
    }));
  });

  worker.on("failed", (job, err) => {
    console.error(JSON.stringify({
      event: "worker_fail",
      worker: "WebhookWorker",
      jobId: job?.id,
      webhookId: job?.data.webhookId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    }));
  });

  return worker;
}

// Encolar un webhook job con 3 reintentos y backoff exponencial
export async function enqueueWebhookJob(data: WebhookJobData): Promise<void> {
  await webhookQueue.add("deliver", data, {
    jobId: `${data.webhookId}-${data.payload.event}-${data.payload.timestamp}`,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  });
}
