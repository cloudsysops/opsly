import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const TEAM_QUEUE_NAMES = [
  "team:frontend-team",
  "team:backend-team",
  "team:ml-team",
  "team:infra-team",
] as const;

function redisConnection(): {
  host: string;
  port: number;
  password: string | undefined;
} {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    password: process.env.REDIS_PASSWORD,
  };
}

async function pipelineTotalForQueue(name: string): Promise<number> {
  const queue = new Queue(name, { connection: redisConnection() });
  try {
    const [waiting, active] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
    ]);
    return waiting + active;
  } finally {
    await queue.close();
  }
}

/**
 * Jobs en cola BullMQ (orquestador + equipos). Sin Redis devuelve null.
 */
export async function getBullmqPipelineJobTotals(): Promise<{
  openclaw_total: number;
  teams_total: number;
  all_queues_total: number;
} | null> {
  try {
    const openclaw = await pipelineTotalForQueue("openclaw");
    const teamTotals = await Promise.all(
      TEAM_QUEUE_NAMES.map((n) => pipelineTotalForQueue(n)),
    );
    const teams_total = teamTotals.reduce((a, b) => a + b, 0);
    return {
      openclaw_total: openclaw,
      teams_total,
      all_queues_total: openclaw + teams_total,
    };
  } catch {
    return null;
  }
}
