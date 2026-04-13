import { Queue } from "bullmq";
import { getBullmqRedisConnection } from "./bullmq-redis";

const QUEUE_DEFS = [
  {
    name: "openclaw",
    label: "Orquestador OpenClaw",
    role: "orchestrator" as const,
  },
  {
    name: "team-frontend-team",
    label: "Agentes · frontend",
    role: "agent_team" as const,
  },
  {
    name: "team-backend-team",
    label: "Agentes · backend",
    role: "agent_team" as const,
  },
  {
    name: "team-ml-team",
    label: "Agentes · ML",
    role: "agent_team" as const,
  },
  {
    name: "team-infra-team",
    label: "Agentes · infra",
    role: "agent_team" as const,
  },
] as const;

export type BullmqQueueDetail = {
  id: string;
  label: string;
  role: "orchestrator" | "agent_team";
  waiting: number;
  active: number;
};

/**
 * Conteos waiting/active por cola BullMQ (orquestador + equipos).
 */
export async function getBullmqQueueDetails(): Promise<{
  redis_available: boolean;
  queues: BullmqQueueDetail[];
}> {
  const connection = getBullmqRedisConnection();
  if (!connection) {
    return { redis_available: false, queues: [] };
  }

  const queues: BullmqQueueDetail[] = [];

  for (const def of QUEUE_DEFS) {
    const queue = new Queue(def.name, { connection });
    try {
      const [waiting, active] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
      ]);
      queues.push({
        id: def.name,
        label: def.label,
        role: def.role,
        waiting,
        active,
      });
    } finally {
      await queue.close();
    }
  }

  return { redis_available: true, queues };
}
