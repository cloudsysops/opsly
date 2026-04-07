import { Queue } from "bullmq";
import type { OrchestratorJob } from "./types.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redisUrl = new URL(REDIS_URL);

export const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || "6379"),
  password: process.env.REDIS_PASSWORD
};

export const orchestratorQueue = new Queue("openclaw", { connection });

export async function enqueueJob(job: OrchestratorJob) {
  return orchestratorQueue.add(job.type, job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 }
  });
}
