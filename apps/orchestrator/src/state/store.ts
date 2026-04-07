import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const JOB_TTL_SECONDS = 86400;

export interface JobState {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  tenant_slug?: string;
  started_at: string;
  completed_at?: string;
  result?: unknown;
  error?: string;
}

let client: ReturnType<typeof createClient> | null = null;

async function getClient() {
  if (!client) {
    client = createClient({
      url: REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    });
    await client.connect();
  }
  return client;
}

export async function setJobState(jobId: string, state: Partial<JobState>): Promise<void> {
  const redis = await getClient();
  const key = `opsly:jobs:${jobId}`;
  const existing = await redis.get(key);
  const current = existing ? (JSON.parse(existing) as Partial<JobState>) : {};
  await redis.setEx(key, JOB_TTL_SECONDS, JSON.stringify({ ...current, ...state }));
}

export async function getJobState(jobId: string): Promise<JobState | null> {
  const redis = await getClient();
  const data = await redis.get(`opsly:jobs:${jobId}`);
  return data ? (JSON.parse(data) as JobState) : null;
}
